import { supabase } from "../lib/supabase.js";
import { SQL_SETUP_HINT } from "./db-errors.js";

/** @deprecated */
export const SESSION_LIST_SELECT = "*";

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

  return {
    ...row,
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
    const { data, error } = await supabase
      .from("session_enrollments")
      .select("session_id")
      .in("session_id", sessionIds);
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
 */
export async function querySessionsList(applyFilters) {
  try {
    let query = supabase.from("sessions").select("*", { count: "exact" });
    query = applyFilters(query);

    const result = await query;
    if (result.error) {
      return {
        data: [],
        count: 0,
        db_warning: result.error.message || SQL_SETUP_HINT
      };
    }

    const data = await enrichSessions(result.data || []);
    return { data, count: result.count ?? 0, db_warning: null };
  } catch (err) {
    return {
      data: [],
      count: 0,
      db_warning: err?.message || SQL_SETUP_HINT
    };
  }
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
