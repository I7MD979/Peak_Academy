import { sessions, enrollments, transactions, questions } from "./mockDb.js";
import { supabase as supabaseAdmin } from "../lib/supabase.js";

const parentLinks = [];
const withdrawals = [];
const auditLogs = [];

function hasSupabaseAdmin() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function listSessions({ subject, grade, status, school_level }) {
  if (hasSupabaseAdmin()) {
    let query = supabaseAdmin.from("sessions").select("*").order("scheduled_at", { ascending: true });
    if (subject) query = query.eq("subject", subject);
    if (grade) query = query.eq("grade", grade);
    if (school_level) query = query.eq("school_level", school_level);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (!error) return data || [];
  }
  return sessions.filter(
    (s) =>
      (!subject || s.subject === subject) &&
      (!grade || s.grade === grade) &&
      (!school_level || s.school_level === school_level) &&
      (!status || s.status === status)
  );
}

async function getSessionById(id) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("sessions").select("*").eq("id", id).maybeSingle();
    if (!error) return data || null;
  }
  return sessions.find((s) => s.id === id) || null;
}

async function createSession(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("sessions").insert(payload).select("*").single();
    if (!error) return data;
  }
  sessions.push(payload);
  return payload;
}

async function countEnrollmentsBySession(sessionId) {
  if (hasSupabaseAdmin()) {
    const { count, error } = await supabaseAdmin.from("enrollments").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
    if (!error) return count || 0;
  }
  return enrollments.filter((e) => e.session_id === sessionId).length;
}

async function findEnrollment(sessionId, studentId) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("*")
      .eq("session_id", sessionId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!error) return data || null;
  }
  return enrollments.find((e) => e.session_id === sessionId && e.student_id === studentId) || null;
}

async function createTransaction(payload) {
  const normalized = { ...payload, amount: toNumber(payload.amount) };
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("transactions").insert(normalized).select("*").single();
    if (!error) return data;
  }
  transactions.push(normalized);
  return normalized;
}

async function updateTransactionStatus(id, status) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("transactions").update({ status }).eq("id", id).select("*").maybeSingle();
    if (!error) return data || null;
  }
  const tx = transactions.find((t) => t.id === id);
  if (tx) tx.status = status;
  return tx || null;
}

async function listUserTransactions(userId) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (!error) return data || [];
  }
  return transactions.filter((t) => t.user_id === userId);
}

async function createEnrollment(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("enrollments").insert(payload).select("*").single();
    if (!error) return data;
  }
  enrollments.push(payload);
  return payload;
}

async function listTeacherSessionEarnings(teacherId) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select("id,price_per_student,enrollments(count)")
      .eq("teacher_id", teacherId);
    if (!error) {
      return (data || []).map((session) => {
        const attendees = session.enrollments?.[0]?.count || 0;
        const gross = attendees * toNumber(session.price_per_student);
        return { session_id: session.id, attendees, gross_amount: gross, teacher_amount: gross * 0.7 };
      });
    }
  }

  return sessions
    .filter((s) => s.teacher_id === teacherId)
    .map((session) => {
      const attendees = enrollments.filter((e) => e.session_id === session.id).length;
      const gross = attendees * toNumber(session.price_per_student);
      return { session_id: session.id, attendees, gross_amount: gross, teacher_amount: gross * 0.7 };
    });
}

async function createWithdrawal(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("withdrawals").insert(payload).select("*").single();
    if (!error) return data;
  }
  withdrawals.push(payload);
  return payload;
}

async function createParentLink(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("parent_links")
      .upsert(payload, { onConflict: "parent_id,student_id" })
      .select("*")
      .single();
    if (!error) return data;
  }
  const existing = parentLinks.find((p) => p.parent_id === payload.parent_id && p.student_id === payload.student_id);
  if (existing) return existing;
  parentLinks.push(payload);
  return payload;
}

async function listStudentEnrollments(studentId) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("id,session_id,status,created_at,sessions(subject,teacher_id)")
      .eq("student_id", studentId);
    if (!error) return data || [];
  }
  return enrollments
    .filter((e) => e.student_id === studentId)
    .map((enrollment) => ({
      ...enrollment,
      sessions: {
        subject: sessions.find((s) => s.id === enrollment.session_id)?.subject || null,
        teacher_id: sessions.find((s) => s.id === enrollment.session_id)?.teacher_id || null
      }
    }));
}

async function createQuestion(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("questions").insert(payload).select("*").single();
    if (!error) return data;
  }
  questions.push(payload);
  return payload;
}

async function listUnansweredQuestions() {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("questions").select("*").eq("status", "unanswered").order("created_at", { ascending: true });
    if (!error) return data || [];
  }
  return questions.filter((q) => q.status === "unanswered");
}

async function answerQuestion(id, answer, teacherId) {
  const patch = { status: "answered", answer: answer || "", teacher_id: teacherId, answered_at: new Date().toISOString() };
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("questions").update(patch).eq("id", id).select("*").maybeSingle();
    if (!error) return data || null;
  }
  const question = questions.find((q) => q.id === id);
  if (!question) return null;
  Object.assign(question, patch);
  return question;
}

async function getAdminStats() {
  if (hasSupabaseAdmin()) {
    const [txRes, sessionsRes] = await Promise.all([
      supabaseAdmin.from("transactions").select("amount").eq("status", "completed"),
      supabaseAdmin.from("sessions").select("id", { count: "exact", head: true })
    ]);
    const revenue = (txRes.data || []).reduce((acc, row) => acc + toNumber(row.amount), 0);
    return { sessions: sessionsRes.count || 0, revenue };
  }
  return {
    sessions: sessions.length,
    revenue: transactions.filter((t) => t.status === "completed").reduce((acc, t) => acc + toNumber(t.amount), 0)
  };
}

async function createAuditLog(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("audit_logs").insert(payload).select("*").single();
    if (!error) return data;
  }
  auditLogs.push(payload);
  return payload;
}

export {
  listSessions,
  getSessionById,
  createSession,
  countEnrollmentsBySession,
  findEnrollment,
  createTransaction,
  updateTransactionStatus,
  listUserTransactions,
  createEnrollment,
  listTeacherSessionEarnings,
  createWithdrawal,
  createParentLink,
  listStudentEnrollments,
  createQuestion,
  listUnansweredQuestions,
  answerQuestion,
  getAdminStats,
  createAuditLog
};
