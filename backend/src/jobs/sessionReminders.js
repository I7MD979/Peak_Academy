import { supabase } from "../lib/supabase.js";
import { enqueueJob } from "../lib/queue.js";
import { isSchemaV2, SCHEMA, sessionStartTime } from "../lib/schema.js";
import { getCacheEntry, setCacheEntry } from "../lib/cache.js";
import { getLiveKitServerUrl } from "../services/livekit.service.js";

const REMINDER_TTL_SEC = 60 * 60 * 3;
const INTERVAL_MS = 30 * 60 * 1000;

async function reminderAlreadySent(sessionId, studentKey) {
  const key = `reminder:${sessionId}:${studentKey}`;
  const existing = await getCacheEntry(key);
  return Boolean(existing?.sent);
}

async function markReminderSent(sessionId, studentKey) {
  const key = `reminder:${sessionId}:${studentKey}`;
  await setCacheEntry(key, REMINDER_TTL_SEC, { sent: true });
}

async function loadUpcomingSessions() {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const queries = [
    supabase
      .from("sessions")
      .select("id, title, scheduled_at, start_time, daily_room_url, daily_room_name")
      .eq("status", "scheduled")
      .gte("scheduled_at", oneHourFromNow)
      .lte("scheduled_at", twoHoursFromNow)
  ];

  if (isSchemaV2()) {
    queries.push(
      supabase
        .from("sessions")
        .select("id, title, scheduled_at, start_time, daily_room_url, daily_room_name")
        .eq("status", "scheduled")
        .gte("start_time", oneHourFromNow)
        .lte("start_time", twoHoursFromNow)
    );
  }

  const results = await Promise.all(queries);
  const merged = new Map();
  for (const res of results) {
    if (res.error) continue;
    for (const row of res.data || []) {
      merged.set(row.id, row);
    }
  }
  return [...merged.values()];
}

async function loadPaidEnrollments(sessionId) {
  if (isSchemaV2()) {
    const { data, error } = await supabase
      .from("enrollments")
      .select("student_id, payment_status")
      .eq("session_id", sessionId)
      .eq("payment_status", "paid");

    if (error) throw error;

    const studentIds = (data || []).map((e) => e.student_id).filter(Boolean);
    if (!studentIds.length) return [];

    const { data: users } = await supabase
      .from("users")
      .select("id, email, full_name")
      .in("id", studentIds);

    const usersById = Object.fromEntries((users || []).map((u) => [u.id, u]));

    return (data || []).map((enrollment) => {
      const user = usersById[enrollment.student_id];
      return {
        studentKey: enrollment.student_id,
        email: user?.email,
        full_name: user?.full_name
      };
    });
  }

  const { data, error } = await supabase
    .from("session_enrollments")
    .select("student_id, status, student:student_profiles(user_id, user:users(email, full_name))")
    .eq("session_id", sessionId)
    .in("status", SCHEMA.confirmedEnrollmentStatuses());

  if (error) throw error;

  return (data || []).map((row) => ({
    studentKey: row.student?.user_id || row.student_id,
    email: row.student?.user?.email,
    full_name: row.student?.user?.full_name
  }));
}

export async function scheduleReminders() {
  try {
    const sessions = await loadUpcomingSessions();

    for (const session of sessions) {
      const enrollments = await loadPaidEnrollments(session.id);
      const roomUrl = session.daily_room_url || session.room_url || getLiveKitServerUrl();

      for (const enrollment of enrollments) {
        if (!enrollment.email || !enrollment.studentKey) continue;
        if (await reminderAlreadySent(session.id, enrollment.studentKey)) continue;

        await enqueueJob("email", "session-reminder", {
          to: enrollment.email,
          studentName: enrollment.full_name,
          sessionTitle: session.title,
          startTime: sessionStartTime(session),
          roomUrl
        });

        await markReminderSent(session.id, enrollment.studentKey);
      }
    }
  } catch (err) {
    console.error("sessionReminders:", err.message);
  }
}

scheduleReminders();
setInterval(scheduleReminders, INTERVAL_MS);

console.log("Session reminder scheduler started (every 30 min)");
