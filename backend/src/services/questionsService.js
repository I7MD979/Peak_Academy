import { supabase } from "../lib/supabase.js";
import { reconcileCompletedTransaction } from "../utils/payments-fulfillment.js";
import { isMissingTableError } from "../utils/db-errors.js";
import { SUBJECT_LABELS, GRADE_LABELS, SUBJECT_OPTIONS } from "./studyRoomsService.js";

export { SUBJECT_OPTIONS, SUBJECT_LABELS, GRADE_LABELS };

const STATUS_LABELS = {
  unanswered: "بانتظار الرد",
  answered: "تم الرد"
};

export function mapQuestionRow(question) {
  if (!question) return null;
  return {
    ...question,
    subject_label: SUBJECT_LABELS[question.subject] || question.subject,
    status_label: STATUS_LABELS[question.status] || question.status,
    teacher_name: question.teacher?.full_name || null,
    teacher_avatar: question.teacher?.avatar_url || null
  };
}

export async function getStudentGrade(userId) {
  const { data: student, error } = await supabase
    .from("student_profiles")
    .select("grade")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  if (!student?.grade) return null;
  return student.grade;
}

export async function getQuestionPricing(subject, grade) {
  const { data, error } = await supabase
    .from("question_pricing")
    .select("*")
    .eq("subject", subject)
    .eq("grade", grade)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return data;
}

export async function getPricingForSubjects(grade) {
  if (!grade) return {};

  const { data, error } = await supabase
    .from("question_pricing")
    .select("subject, amount, is_active")
    .eq("grade", grade)
    .eq("is_active", true);

  if (error) {
    if (isMissingTableError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[question_pricing] table missing — run backend/supabase/migrations/20260606_notifications_question_pricing.sql"
        );
      }
      return {};
    }
    throw error;
  }

  const map = {};
  for (const row of data || []) {
    map[row.subject] = Number(row.amount || 0);
  }
  return map;
}

async function listStudentQuestionRows(userId) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, status")
    .eq("student_id", userId);

  if (error) {
    if (isMissingTableError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[questions] table missing — run backend/supabase/migrations/20260607_questions_table.sql in Supabase SQL Editor"
        );
      }
      return [];
    }
    throw error;
  }
  return data || [];
}

export async function getQuestionsOverview(userId) {
  const grade = await getStudentGrade(userId);
  const pricingBySubject = await getPricingForSubjects(grade);

  const rows = await listStudentQuestionRows(userId);
  const unanswered = rows.filter((q) => q.status === "unanswered").length;
  const answered = rows.filter((q) => q.status === "answered").length;

  const subjects = SUBJECT_OPTIONS.map((s) => ({
    ...s,
    price: pricingBySubject[s.key] ?? 0,
    is_free: (pricingBySubject[s.key] ?? 0) <= 0
  }));

  return {
    grade,
    grade_label: GRADE_LABELS[grade] || grade,
    subjects,
    stats: {
      total: rows.length,
      unanswered,
      answered
    }
  };
}

export async function listStudentQuestions(userId, { tab = "all", page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const from = (pageNum - 1) * limitNum;
  const to = from + limitNum - 1;

  let query = supabase
    .from("questions")
    .select(
      "*, teacher:users!questions_teacher_id_fkey(id, full_name, avatar_url)",
      { count: "exact" }
    )
    .eq("student_id", userId)
    .order("created_at", { ascending: false });

  if (tab === "unanswered") query = query.eq("status", "unanswered");
  if (tab === "answered") query = query.eq("status", "answered");

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      return {
        questions: [],
        pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 1 }
      };
    }
    throw error;
  }

  return {
    questions: (data || []).map(mapQuestionRow),
    pagination: {
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum) || 1
    }
  };
}

export async function getStudentQuestion(userId, questionId) {
  const { data, error } = await supabase
    .from("questions")
    .select("*, teacher:users!questions_teacher_id_fkey(id, full_name, avatar_url)")
    .eq("id", questionId)
    .eq("student_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapQuestionRow(data);
}

export async function verifyQuestionPayment(userId, paymentId, { subject, content }) {
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", paymentId)
    .eq("user_id", userId)
    .eq("type", "question_payment")
    .maybeSingle();

  if (error || !tx) return false;

  const meta = tx.metadata || {};
  if (meta.subject !== subject || meta.content !== content) return false;

  const { data: existingQuestion } = await supabase
    .from("questions")
    .select("id")
    .eq("id", `q-${paymentId}`)
    .maybeSingle();

  if (existingQuestion) return true;

  if (tx.status !== "completed") return false;

  const result = await reconcileCompletedTransaction(tx);
  return Boolean(result.question_created);
}

export async function createQuestion({ userId, subject, content, paymentId = null, teacherId = null }) {
  const questionId = paymentId ? `q-${paymentId}` : `q-${Date.now()}`;

  if (paymentId) {
    const { data: existing } = await supabase
      .from("questions")
      .select("*, teacher:users!questions_teacher_id_fkey(id, full_name, avatar_url)")
      .eq("id", questionId)
      .maybeSingle();

    if (existing) return mapQuestionRow(existing);
  }

  const { data, error } = await supabase
    .from("questions")
    .insert({
      id: questionId,
      student_id: userId,
      teacher_id: teacherId,
      subject,
      content: content.trim(),
      status: "unanswered"
    })
    .select("*, teacher:users!questions_teacher_id_fkey(id, full_name, avatar_url)")
    .single();

  if (error) throw error;
  return mapQuestionRow(data);
}
