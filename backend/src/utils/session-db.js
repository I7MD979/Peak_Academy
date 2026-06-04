import { supabase } from "../lib/supabase.js";

export function isMissingColumnError(err) {
  const msg = String(err?.message || "");
  return err?.code === "42703" || err?.code === "PGRST204" || /column|does not exist/i.test(msg);
}

export function isLiveStatusSchemaError(err) {
  const msg = String(err?.message || "");
  return (
    err?.code === "23514" ||
    err?.code === "LIVE_STATUS_UNSUPPORTED" ||
    /sessions_status_check|live/i.test(msg)
  );
}

const SESSION_START_SELECTS = [
  "id, title, status, scheduled_at, start_time, max_students, daily_room_url, room_url, daily_room_name",
  "id, title, status, scheduled_at, max_students, daily_room_url, room_url, daily_room_name",
  "id, title, status, scheduled_at, max_students, room_url",
  "id, title, status, scheduled_at, max_students"
];

const SESSION_JOIN_SELECTS = [
  "id, title, status, teacher_id, scheduled_at, start_time, daily_room_url, daily_room_name, room_url, max_students",
  "id, title, status, teacher_id, scheduled_at, daily_room_url, daily_room_name, room_url, max_students",
  "id, title, status, teacher_id, scheduled_at, room_url, max_students",
  "id, title, status, teacher_id, scheduled_at, max_students"
];

const SESSION_LIVE_SELECTS = [
  "daily_room_url, room_url, status",
  "room_url, status",
  "id, status"
];

export async function fetchSessionForJoin(sessionId) {
  let lastError = null;

  for (const columns of SESSION_JOIN_SELECTS) {
    const { data, error } = await supabase
      .from("sessions")
      .select(columns)
      .eq("id", sessionId)
      .maybeSingle();

    if (!error && data) return data;
    lastError = error;
    if (error && !isMissingColumnError(error)) throw error;
  }

  if (lastError) throw lastError;
  return null;
}

export async function fetchSessionForStart(sessionId) {
  let lastError = null;

  for (const columns of SESSION_START_SELECTS) {
    const { data, error } = await supabase
      .from("sessions")
      .select(columns)
      .eq("id", sessionId)
      .maybeSingle();

    if (!error && data) return data;
    lastError = error;
    if (error && !isMissingColumnError(error)) throw error;
  }

  if (lastError) throw lastError;
  return null;
}

export async function markSessionLive(sessionId) {
  let lastError = null;

  for (const columns of SESSION_LIVE_SELECTS) {
    const { data, error } = await supabase
      .from("sessions")
      .update({ status: "live" })
      .eq("id", sessionId)
      .select(columns)
      .maybeSingle();

    if (!error) return data;
    lastError = error;

    if (isLiveStatusSchemaError(error)) {
      const schemaErr = new Error("LIVE_STATUS_UNSUPPORTED");
      schemaErr.code = "LIVE_STATUS_UNSUPPORTED";
      throw schemaErr;
    }

    if (!isMissingColumnError(error)) break;
  }

  throw lastError || new Error("تعذر تحديث حالة الجلسة");
}

export function clampSessionDuration(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n)) return 60;
  return Math.min(180, Math.max(30, Math.round(n)));
}
