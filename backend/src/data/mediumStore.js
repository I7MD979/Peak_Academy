import { supabase as supabaseAdmin } from "../lib/supabase.js";
import { listStudentEnrollments } from "./coreStore.js";

const weeklySubscriptions = [];
const parentReports = [];
const studyRooms = [];
const studyRoomMembers = [];
const notifications = [];
const reviews = [];

function hasSupabaseAdmin() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function computeNextSendAt(dayOfWeek, hourUtc) {
  const now = new Date();
  const next = new Date(now);
  const dayDiff = (dayOfWeek - now.getUTCDay() + 7) % 7;
  next.setUTCDate(now.getUTCDate() + dayDiff);
  next.setUTCHours(hourUtc, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
  return next.toISOString();
}

async function upsertWeeklySubscription(payload) {
  const normalized = {
    ...payload,
    next_send_at: computeNextSendAt(payload.day_of_week, payload.hour_utc)
  };

  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("weekly_email_subscriptions")
      .upsert(normalized, { onConflict: "parent_id,student_id" })
      .select("*")
      .single();
    if (!error) return data;
  }

  const existing = weeklySubscriptions.find((s) => s.parent_id === normalized.parent_id && s.student_id === normalized.student_id);
  if (existing) {
    Object.assign(existing, normalized);
    return existing;
  }
  const row = { id: `wes-${Date.now()}`, created_at: new Date().toISOString(), ...normalized };
  weeklySubscriptions.push(row);
  return row;
}

async function createParentReport(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("parent_reports").insert(payload).select("*").single();
    if (!error) return data;
  }
  parentReports.push(payload);
  return payload;
}

async function listDueWeeklySubscriptions(nowIso) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("weekly_email_subscriptions")
      .select("*")
      .eq("enabled", true)
      .lte("next_send_at", nowIso);
    if (!error) return data || [];
  }
  return weeklySubscriptions.filter((s) => s.enabled && s.next_send_at <= nowIso);
}

async function bumpWeeklySubscription(id, dayOfWeek, hourUtc) {
  const next_send_at = computeNextSendAt(dayOfWeek, hourUtc);
  if (hasSupabaseAdmin()) {
    await supabaseAdmin.from("weekly_email_subscriptions").update({ next_send_at }).eq("id", id);
  }
  const existing = weeklySubscriptions.find((s) => s.id === id);
  if (existing) existing.next_send_at = next_send_at;
}

async function findOpenStudyRoom(subject, grade) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("study_rooms")
      .select("*")
      .eq("subject", subject)
      .eq("grade", grade)
      .in("status", ["open", "active"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!error) return data || null;
  }
  return studyRooms.find((r) => r.subject === subject && r.grade === grade && (r.status === "open" || r.status === "active")) || null;
}

async function createStudyRoom(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("study_rooms").insert(payload).select("*").single();
    if (!error) return data;
  }
  studyRooms.push(payload);
  return payload;
}

async function countActiveRoomMembers(roomId) {
  if (hasSupabaseAdmin()) {
    const { count, error } = await supabaseAdmin
      .from("study_room_members")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId)
      .is("left_at", null);
    if (!error) return count || 0;
  }
  return studyRoomMembers.filter((m) => m.room_id === roomId && !m.left_at).length;
}

async function addRoomMember(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("study_room_members").insert(payload).select("*").single();
    if (!error) return data;
  }
  studyRoomMembers.push(payload);
  return payload;
}

async function markRoomStatus(roomId, status) {
  if (hasSupabaseAdmin()) await supabaseAdmin.from("study_rooms").update({ status }).eq("id", roomId);
  const room = studyRooms.find((r) => r.id === roomId);
  if (room) room.status = status;
}

async function leaveRoom(roomId, userId) {
  const leftAt = new Date().toISOString();
  if (hasSupabaseAdmin()) {
    await supabaseAdmin.from("study_room_members").update({ left_at: leftAt }).eq("room_id", roomId).eq("user_id", userId).is("left_at", null);
  }
  const member = studyRoomMembers.find((m) => m.room_id === roomId && m.user_id === userId && !m.left_at);
  if (member) member.left_at = leftAt;
  return leftAt;
}

async function createNotification(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("notifications").insert(payload).select("*").single();
    if (!error) return data;
  }
  notifications.push(payload);
  return payload;
}

async function listUserNotifications(userId) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) return data || [];
  }
  return notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function markNotificationRead(id, userId) {
  const patch = { is_read: true, read_at: new Date().toISOString() };
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("notifications").update(patch).eq("id", id).eq("user_id", userId).select("*").maybeSingle();
    if (!error) return data || null;
  }
  const row = notifications.find((n) => n.id === id && n.user_id === userId);
  if (!row) return null;
  Object.assign(row, patch);
  return row;
}

async function createReview(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("reviews").insert(payload).select("*").single();
    if (!error) return data;
  }
  reviews.push(payload);
  return payload;
}

async function listTeacherReviews(teacherId) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("reviews").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false });
    if (!error) return data || [];
  }
  return reviews.filter((r) => r.teacher_id === teacherId);
}

async function replyToReview(id, teacherId, teacherReply) {
  const patch = { teacher_reply: teacherReply, replied_at: new Date().toISOString() };
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("reviews").update(patch).eq("id", id).eq("teacher_id", teacherId).select("*").maybeSingle();
    if (!error) return data || null;
  }
  const row = reviews.find((r) => r.id === id && r.teacher_id === teacherId);
  if (!row) return null;
  Object.assign(row, patch);
  return row;
}

async function hasStudentAttendedTeacher(studentId, teacherId) {
  const enrollments = await listStudentEnrollments(studentId);
  return enrollments.some((enrollment) => enrollment.sessions?.teacher_id === teacherId || enrollment.teacher_id === teacherId);
}

export {
  upsertWeeklySubscription,
  createParentReport,
  listDueWeeklySubscriptions,
  bumpWeeklySubscription,
  findOpenStudyRoom,
  createStudyRoom,
  countActiveRoomMembers,
  addRoomMember,
  markRoomStatus,
  leaveRoom,
  createNotification,
  listUserNotifications,
  markNotificationRead,
  createReview,
  listTeacherReviews,
  replyToReview,
  hasStudentAttendedTeacher
};
