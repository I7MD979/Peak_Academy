const { supabaseAdmin } = require("../lib/supabase");
const { sessions, enrollments } = require("./mockDb");

const pricingRows = [];
const marketplaceRoutes = [];
const quizzes = [];
const quizQuestions = [];
const quizAttempts = [];
const recordings = [];

function hasSupabaseAdmin() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

async function upsertQuestionPricing(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("question_pricing")
      .upsert(payload, { onConflict: "subject,grade" })
      .select("*")
      .single();
    if (!error) return data;
  }
  const existing = pricingRows.find((p) => p.subject === payload.subject && p.grade === payload.grade);
  if (existing) {
    Object.assign(existing, payload);
    return existing;
  }
  const row = { id: `qp-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
  pricingRows.push(row);
  return row;
}

async function getQuestionPricing(subject, grade) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("question_pricing")
      .select("*")
      .eq("subject", subject)
      .eq("grade", grade)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error) return data || null;
  }
  return pricingRows.find((p) => p.subject === subject && p.grade === grade && p.is_active) || null;
}

async function createMarketplaceRoute(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("marketplace_routes").insert(payload).select("*").single();
    if (!error) return data;
  }
  marketplaceRoutes.push(payload);
  return payload;
}

async function listTeacherRoutes(teacherId) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_routes")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });
    if (!error) return data || [];
  }
  return marketplaceRoutes.filter((r) => r.teacher_id === teacherId);
}

async function createQuiz(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("live_quizzes").insert(payload).select("*").single();
    if (!error) return data;
  }
  quizzes.push(payload);
  return payload;
}

async function addQuizQuestion(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("live_quiz_questions").insert(payload).select("*").single();
    if (!error) return data;
  }
  quizQuestions.push(payload);
  return payload;
}

async function startQuiz(quizId, startsAt) {
  const patch = { status: "live", starts_at: startsAt };
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("live_quizzes").update(patch).eq("id", quizId).select("*").maybeSingle();
    if (!error) return data || null;
  }
  const q = quizzes.find((quiz) => quiz.id === quizId);
  if (!q) return null;
  Object.assign(q, patch);
  return q;
}

async function getQuizWithQuestions(quizId) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("live_quizzes")
      .select("*,live_quiz_questions(*)")
      .eq("id", quizId)
      .maybeSingle();
    if (!error) return data || null;
  }
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) return null;
  return { ...quiz, live_quiz_questions: quizQuestions.filter((qq) => qq.quiz_id === quizId) };
}

async function submitQuizAttempt(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("live_quiz_attempts")
      .upsert(payload, { onConflict: "quiz_id,user_id" })
      .select("*")
      .single();
    if (!error) return data;
  }
  const existing = quizAttempts.find((a) => a.quiz_id === payload.quiz_id && a.user_id === payload.user_id);
  if (existing) {
    Object.assign(existing, payload);
    return existing;
  }
  quizAttempts.push(payload);
  return payload;
}

async function getQuizAnalytics(quizId) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("live_quiz_attempts").select("score").eq("quiz_id", quizId);
    if (!error) {
      const rows = data || [];
      const attempts = rows.length;
      const avgScore = attempts ? rows.reduce((a, r) => a + (r.score || 0), 0) / attempts : 0;
      return { attempts, avg_score: Number(avgScore.toFixed(2)) };
    }
  }
  const rows = quizAttempts.filter((a) => a.quiz_id === quizId);
  const attempts = rows.length;
  const avgScore = attempts ? rows.reduce((a, r) => a + (r.score || 0), 0) / attempts : 0;
  return { attempts, avg_score: Number(avgScore.toFixed(2)) };
}

async function createRecording(payload) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("session_recordings").insert(payload).select("*").single();
    if (!error) return data;
  }
  recordings.push(payload);
  return payload;
}

async function getRecording(recordingId) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin.from("session_recordings").select("*").eq("id", recordingId).maybeSingle();
    if (!error) return data || null;
  }
  return recordings.find((r) => r.id === recordingId) || null;
}

async function canAccessRecording(recording, user) {
  if (!recording || !user) return false;
  if (user.role === "admin") return true;
  if (recording.teacher_id === user.id) return true;
  if (recording.visibility === "public") return true;
  if (recording.visibility === "private") return false;

  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("session_id", recording.session_id)
      .eq("student_id", user.id)
      .in("status", ["enrolled", "attended"])
      .maybeSingle();
    return !error && Boolean(data);
  }

  return Boolean(enrollments.find((e) => e.session_id === recording.session_id && e.student_id === user.id && ["enrolled", "attended"].includes(e.status)));
}

module.exports = {
  upsertQuestionPricing,
  getQuestionPricing,
  createMarketplaceRoute,
  listTeacherRoutes,
  createQuiz,
  addQuizQuestion,
  startQuiz,
  getQuizWithQuestions,
  submitQuizAttempt,
  getQuizAnalytics,
  createRecording,
  getRecording,
  canAccessRecording
};
