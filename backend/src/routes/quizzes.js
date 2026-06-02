const express = require("express");
const { z } = require("zod");
const { auth, checkRole } = require("../middleware/auth");
const { ok, fail } = require("../utils/response");
const {
  createQuiz,
  addQuizQuestion,
  startQuiz,
  getQuizWithQuestions,
  submitQuizAttempt,
  getQuizAnalytics
} = require("../data/growthStore");

const router = express.Router();

router.post("/", auth, checkRole("teacher"), async (req, res) => {
  const parsed = z.object({
    title: z.string().min(3),
    subject: z.string().min(2)
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Validation error", parsed.error.flatten());
  const row = await createQuiz({
    id: `qz-${Date.now()}`,
    teacher_id: req.user.id,
    title: parsed.data.title,
    subject: parsed.data.subject,
    status: "draft",
    created_at: new Date().toISOString()
  });
  return ok(res, row);
});

router.post("/:quizId/questions", auth, checkRole("teacher"), async (req, res) => {
  const parsed = z.object({
    prompt: z.string().min(3),
    options: z.array(z.string().min(1)).min(2),
    correct_option: z.string().min(1)
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Validation error", parsed.error.flatten());
  const row = await addQuizQuestion({
    id: `qzq-${Date.now()}`,
    quiz_id: req.params.quizId,
    prompt: parsed.data.prompt,
    options: parsed.data.options,
    correct_option: parsed.data.correct_option
  });
  return ok(res, row);
});

router.post("/:quizId/start", auth, checkRole("teacher"), async (req, res) => {
  const row = await startQuiz(req.params.quizId, new Date().toISOString());
  if (!row) return fail(res, 404, "Quiz not found");
  return ok(res, row);
});

router.get("/:quizId", auth, async (req, res) => {
  const quiz = await getQuizWithQuestions(req.params.quizId);
  if (!quiz) return fail(res, 404, "Quiz not found");
  return ok(res, quiz);
});

router.post("/:quizId/submit", auth, checkRole("student"), async (req, res) => {
  const parsed = z.object({ answers: z.record(z.string(), z.string()) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Validation error", parsed.error.flatten());
  const quiz = await getQuizWithQuestions(req.params.quizId);
  if (!quiz) return fail(res, 404, "Quiz not found");

  const questions = quiz.live_quiz_questions || [];
  let score = 0;
  for (const question of questions) {
    if (parsed.data.answers[question.id] === question.correct_option) score += 1;
  }

  const row = await submitQuizAttempt({
    id: `qza-${Date.now()}`,
    quiz_id: req.params.quizId,
    user_id: req.user.id,
    score,
    answers: parsed.data.answers,
    submitted_at: new Date().toISOString()
  });
  return ok(res, row, { analytics: await getQuizAnalytics(req.params.quizId) });
});

router.get("/:quizId/analytics", auth, checkRole("teacher", "admin"), async (req, res) => {
  return ok(res, await getQuizAnalytics(req.params.quizId));
});

module.exports = router;
