import { isSchemaV2, SCHEMA } from "../lib/schema.js";
import { isMissingTableError } from "./db-errors.js";
import { isMissingColumnError } from "./session-db.js";

function mapLegacyEnrollmentRow(row) {
  const enrollmentStatus = row.status;
  const paymentStatus =
    enrollmentStatus === "enrolled" || enrollmentStatus === "attended" ? "paid" : "pending";
  const attendance =
    enrollmentStatus === "attended"
      ? "attended"
      : enrollmentStatus === "enrolled"
        ? "enrolled"
        : enrollmentStatus;

  return {
    id: row.id,
    status: enrollmentStatus,
    created_at: row.created_at,
    student_user_id: row.student?.user?.id || row.user?.id || null,
    student_name: row.student?.user?.full_name || row.user?.full_name || "طالب",
    student_email: row.student?.user?.email || row.user?.email || null,
    student_phone: row.student?.user?.phone || row.user?.phone || null,
    student_avatar_url: row.student?.user?.avatar_url || row.user?.avatar_url || null,
    payment_status: paymentStatus,
    attendance
  };
}

function mapV2EnrollmentRow(row, user = null) {
  const enrollmentStatus = row.status;
  const userRow = row.student || user || null;
  const paymentStatus =
    row.payment_status ||
    (enrollmentStatus === "confirmed" || enrollmentStatus === "attended" ? "paid" : "pending");
  const attendance =
    enrollmentStatus === "attended"
      ? "attended"
      : enrollmentStatus === "confirmed"
        ? "enrolled"
        : enrollmentStatus;

  return {
    id: row.id,
    status: enrollmentStatus,
    created_at: row.enrolled_at || row.created_at,
    student_user_id: userRow?.id || row.student_id || null,
    student_name: userRow?.full_name || "طالب",
    student_email: userRow?.email || null,
    student_phone: userRow?.phone || null,
    student_avatar_url: userRow?.avatar_url || null,
    payment_status: paymentStatus,
    attendance
  };
}

async function loadUsersByIds(supabase, userIds) {
  if (!userIds.length) return {};
  const attempts = [
    "id, full_name, email, phone, avatar_url",
    "id, full_name, email, phone"
  ];
  for (const columns of attempts) {
    const { data, error } = await supabase.from("users").select(columns).in("id", userIds);
    if (!error && data) {
      return Object.fromEntries(data.map((u) => [u.id, u]));
    }
    if (error && !isMissingColumnError(error)) break;
  }
  return {};
}

async function queryV2Enrollments(supabase, sessionId, { activeOnly = false } = {}) {
  const statuses = activeOnly ? SCHEMA.confirmedEnrollmentStatuses() : null;
  const selectAttempts = [
    "id, status, payment_status, enrolled_at, student:users!enrollments_student_id_fkey(id, full_name, email, phone, avatar_url)",
    "id, status, payment_status, enrolled_at, student:users(id, full_name, email, phone, avatar_url)",
    "id, status, payment_status, enrolled_at, student:users(id, full_name, email, phone)",
    "id, status, payment_status, enrolled_at, student_id"
  ];

  let lastError = null;
  for (const columns of selectAttempts) {
    let query = supabase
      .from("enrollments")
      .select(columns)
      .eq("session_id", sessionId)
      .order("enrolled_at", { ascending: true });

    if (statuses?.length) query = query.in("status", statuses);

    const { data, error } = await query;
    if (!error) {
      const rows = data || [];
      if (rows[0] && rows[0].student_id && !rows[0].student) {
        const users = await loadUsersByIds(
          supabase,
          rows.map((r) => r.student_id).filter(Boolean)
        );
        return rows.map((row) => mapV2EnrollmentRow(row, users[row.student_id]));
      }
      return rows.map((row) => mapV2EnrollmentRow(row));
    }
    lastError = error;
    if (!isMissingColumnError(error) && error.code !== "PGRST200") break;
  }

  throw lastError || new Error("Failed to load enrollments");
}

async function queryLegacyEnrollments(supabase, sessionId, { activeOnly = false } = {}) {
  const statuses = activeOnly ? ["enrolled", "attended"] : null;
  const selectAttempts = [
    "id, status, created_at, student:student_profiles(id, user:users(id, full_name, email, phone, avatar_url))",
    "id, status, created_at, student:student_profiles(id, user:users(id, full_name, email, phone))",
    "id, status, created_at, student_id"
  ];

  let lastError = null;
  for (const columns of selectAttempts) {
    let query = supabase
      .from("session_enrollments")
      .select(columns)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (statuses?.length) query = query.in("status", statuses);

    const { data, error } = await query;
    if (!error) {
      const rows = data || [];
      if (rows[0]?.student_id && !rows[0]?.student) {
        const { data: profiles } = await supabase
          .from("student_profiles")
          .select("id, user:users(id, full_name, email, phone, avatar_url)")
          .in("id", rows.map((r) => r.student_id).filter(Boolean));
        const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
        return rows.map((row) =>
          mapLegacyEnrollmentRow({
            ...row,
            student: profileMap[row.student_id] || null
          })
        );
      }
      return rows.map((row) => mapLegacyEnrollmentRow(row));
    }
    lastError = error;
    if (!isMissingColumnError(error) && error.code !== "PGRST200") break;
  }

  throw lastError || new Error("Failed to load enrollments");
}

/** Teacher/admin enrollment list — schema v1 (session_enrollments) and v2 (enrollments). */
export async function querySessionEnrollmentsForTeacher(supabase, sessionId, options = {}) {
  const preferV2 = isSchemaV2();
  try {
    if (preferV2) return await queryV2Enrollments(supabase, sessionId, options);
    return await queryLegacyEnrollments(supabase, sessionId, options);
  } catch (err) {
    if (isMissingTableError(err) || err?.code === "PGRST200") {
      if (preferV2) return queryLegacyEnrollments(supabase, sessionId, options);
      return queryV2Enrollments(supabase, sessionId, options);
    }
    throw err;
  }
}

