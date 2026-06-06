import { supabase } from "../lib/supabase.js";
import { reconcileCompletedTransaction } from "../utils/payments-fulfillment.js";
import { isMissingTableError } from "../utils/db-errors.js";
import { SUBJECT_LABELS, GRADE_LABELS, SUBJECT_OPTIONS, normalizeStudyRoomGrade } from "./studyRoomsService.js";

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
  const subjectKey = String(subject || "").trim().toLowerCase();
  const roomGrade = normalizeStudyRoomGrade(grade);
  const { data, error } = await supabase
    .from("question_pricing")
    .select("*")
    .eq("subject", subjectKey)
    .eq("grade", roomGrade)
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

  const roomGrade = normalizeStudyRoomGrade(grade);
  const { data, error } = await supabase
    .from("question_pricing")
    .select("subject, amount, is_active")
    .eq("grade", roomGrade)
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

const VALID_QUESTION_TABS = new Set(["all", "unanswered", "answered"]);
const VALID_SUBJECT_KEYS = Object.keys(SUBJECT_LABELS).filter((k) => k !== "general");

function parseQuestionDateRange(fromRaw, toRaw) {
  const result = { from: null, to: null, invalid: false };
  if (fromRaw) {
    const fromDate = new Date(String(fromRaw));
    if (Number.isNaN(fromDate.getTime())) {
      result.invalid = true;
      return result;
    }
    result.from = fromDate.toISOString();
  }
  if (toRaw) {
    const toDate = new Date(String(toRaw));
    if (Number.isNaN(toDate.getTime())) {
      result.invalid = true;
      return result;
    }
    toDate.setHours(23, 59, 59, 999);
    result.to = toDate.toISOString();
  }
  if (result.from && result.to && result.from > result.to) {
    result.invalid = true;
  }
  return result;
}

export async function listStudentQuestions(
  userId,
  { tab = "all", page = 1, limit = 10, subject = null, from: fromRaw = null, to: toRaw = null } = {}
) {
  const tabKey = String(tab);
  if (!VALID_QUESTION_TABS.has(tabKey)) {
    throw Object.assign(new Error("تبويب غير صالح"), { status: 400 });
  }

  const subjectKey = subject ? String(subject).trim().toLowerCase() : null;
  if (subjectKey && !VALID_SUBJECT_KEYS.includes(subjectKey)) {
    throw Object.assign(new Error("المادة غير صالحة"), { status: 400 });
  }

  const dateRange = parseQuestionDateRange(fromRaw, toRaw);
  if (dateRange.invalid) {
    throw Object.assign(new Error("نطاق التاريخ غير صالح"), { status: 400 });
  }

  const pageNum = Math.max(1, Math.min(100, parseInt(page, 10) || 1));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
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

  if (tabKey === "unanswered") query = query.eq("status", "unanswered");
  if (tabKey === "answered") query = query.eq("status", "answered");
  if (subjectKey) query = query.eq("subject", subjectKey);
  if (dateRange.from) query = query.gte("created_at", dateRange.from);
  if (dateRange.to) query = query.lte("created_at", dateRange.to);

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
