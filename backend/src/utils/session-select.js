import { supabase } from "../lib/supabase.js";
import { SQL_SETUP_HINT } from "./db-errors.js";
import { isSchemaV2, SCHEMA, sessionStartTime } from "../lib/schema.js";

function isRetryableSessionsQueryError(err) {
  if (!err) return false;
  const msg = String(err.message || "");
  return (
    err.code === "42703" ||
    err.code === "PGRST204" ||
    /scheduled_at|start_time|column|does not exist/i.test(msg)
  );
}

export function sessionsOrderColumns() {
  const primary = isSchemaV2() ? "start_time" : "scheduled_at";
  return [...new Set([primary, "scheduled_at", "start_time", "created_at"])];
}

/** Columns for session lists (avoid select * payload bloat). */
export const SESSION_LIST_COLUMNS =
  "id, title, subject, subject_id, grade, school_level, scheduled_at, start_time, status, max_students, price_per_student, teacher_id, duration_min, created_at";

/** @deprecated use SESSION_LIST_COLUMNS for lists; detail views may still select * */
export const SESSION_LIST_SELECT = SESSION_LIST_COLUMNS;

export function normalizeSessionRow(row, { teacherMap = {}, enrollmentCounts = {} } = {}) {
  if (!row || typeof row !== "object") return row;

  const teacher = row.teacher || (row.teacher_id ? teacherMap[row.teacher_id] : null) || null;
  const enrollmentCount =
    Number(enrollmentCounts[row.id] ?? 0) ||
    Number(
      (Array.isArray(row.session_enrollments) ? row.session_enrollments[0]?.count : null) ??
        (Array.isArray(row.enrollments) ? row.enrollments[0]?.count : null) ??
        row.enrollment_count ??
        0
    );

  const subjectFromJoin = row.subject && typeof row.subject === "object" ? row.subject : null;
  const subjectName =
    subjectFromJoin?.name_ar || (typeof row.subject === "string" ? row.subject : null) || "مادة";

  const startAt = sessionStartTime(row);

  return {
    ...row,
    scheduled_at: row.scheduled_at ?? startAt ?? null,
    start_time: row.start_time ?? startAt ?? null,
    teacher,
    enrollment_count: enrollmentCount,
    enrollments: [{ count: enrollmentCount }],
    subject: subjectFromJoin || {
      name_ar: subjectName,
      icon: subjectFromJoin?.icon || null
    },
    subject_name: subjectName
  };
}

export function normalizeSessionRows(rows, context = {}) {
  return (rows || []).map((row) => normalizeSessionRow(row, context));
}

async function loadTeachersMap(teacherIds) {
  if (!teacherIds.length) return {};
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id,full_name,avatar_url")
      .in("id", teacherIds);
    if (error) return {};
    return Object.fromEntries((data || []).map((u) => [u.id, u]));
  } catch {
    return {};
  }
}

async function loadEnrollmentCounts(sessionIds) {
  if (!sessionIds.length) return {};
  try {
    if (isSchemaV2()) {
      const { data, error } = await supabase.rpc("count_enrollments_by_sessions", {
        session_ids: sessionIds
      });
      if (!error && data?.length) {
        return Object.fromEntries(data.map((row) => [row.session_id, Number(row.enrollment_count)]));
      }
    }

    const table = isSchemaV2() ? "enrollments" : "session_enrollments";
    const statusFilter = SCHEMA.confirmedEnrollmentStatuses();
    let query = supabase.from(table).select("session_id").in("session_id", sessionIds);
    if (isSchemaV2()) {
      query = query.in("status", statusFilter);
    }
    const { data, error } = await query;
    if (error) return {};
    const counts = {};
    for (const row of data || []) {
      counts[row.session_id] = (counts[row.session_id] || 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

export async function enrichSessions(rows) {
  if (!rows?.length) return [];

  try {
    const teacherIds = [...new Set(rows.map((r) => r.teacher_id).filter(Boolean))];
    const sessionIds = rows.map((r) => r.id).filter(Boolean);

    const [teacherMap, enrollmentCounts] = await Promise.all([
      loadTeachersMap(teacherIds),
      loadEnrollmentCounts(sessionIds)
    ]);

    return normalizeSessionRows(rows, { teacherMap, enrollmentCounts });
  } catch {
    return normalizeSessionRows(rows);
  }
}

/**
 * List sessions — never throws; returns empty list if DB/schema is not ready.
 * @param {(query: import("@supabase/supabase-js").PostgrestFilterBuilder, orderColumn: string, opts?: { skipSubjectId?: boolean }) => unknown} applyFilters
 */
export async function querySessionsList(applyFilters) {
  let lastError = null;

  for (const skipSubjectId of [false, true]) {
    for (const orderColumn of sessionsOrderColumns()) {
      try {
        let query = supabase.from("sessions").select(SESSION_LIST_COLUMNS, { count: "exact" });
        query = applyFilters(query, orderColumn, { skipSubjectId });

        const result = await query;
        if (!result.error) {
          const data = await enrichSessions(result.data || []);
          return { data, count: result.count ?? 0, db_warning: null };
        }

        lastError = result.error;
        if (!isRetryableSessionsQueryError(result.error)) {
          return {
            data: [],
            count: 0,
            db_warning: lastError?.message || SQL_SETUP_HINT
          };
        }
      } catch (err) {
        lastError = err;
        if (!isRetryableSessionsQueryError(err)) {
          return {
            data: [],
            count: 0,
            db_warning: lastError?.message || SQL_SETUP_HINT
          };
        }
      }
    }
  }

  return {
    data: [],
    count: 0,
    db_warning: lastError?.message || SQL_SETUP_HINT
  };
}

export async function querySessionById(sessionId, applyFilters = (q) => q) {
  try {
    let query = supabase.from("sessions").select("*").eq("id", sessionId);
    query = applyFilters(query);

    const result = await query.maybeSingle();
    if (result.error || !result.data) return null;

    const [enriched] = await enrichSessions([result.data]);
    return enriched || null;
  } catch {
    return null;
  }
}
