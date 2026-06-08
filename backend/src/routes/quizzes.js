import express from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { success, error } from "../utils/response.js";
import {
  createQuiz,
  addQuizQuestion,
  startQuiz,
  getQuizWithQuestions,
  submitQuizAttempt,
  getQuizAnalytics
} from "../data/growthStore.js";

const router = express.Router();

router.post("/", auth, checkRole("teacher"), async (req, res) => {
  const parsed = z.object({
    title: z.string().min(3),
    subject: z.string().min(2)
  }).safeParse(req.body);
  if (!parsed.success) return error(res, "Validation error", 400, parsed.error.flatten());
  const row = await createQuiz({
    id: `qz-${Date.now()}`,
    teacher_id: req.user.id,
    title: parsed.data.title,
    subject: parsed.data.subject,
    status: "draft",
    created_at: new Date().toISOString()
  });
  return success(res, row);
});

router.post("/:quizId/questions", auth, checkRole("teacher"), async (req, res) => {
  const parsed = z.object({
    prompt: z.string().min(3),
    options: z.array(z.string().min(1)).min(2),
    correct_option: z.string().min(1)
  }).safeParse(req.body);
  if (!parsed.success) return error(res, "Validation error", 400, parsed.error.flatten());
  const row = await addQuizQuestion({
    id: `qzq-${Date.now()}`,
    quiz_id: req.params.quizId,
    prompt: parsed.data.prompt,
    options: parsed.data.options,
    correct_option: parsed.data.correct_option
  });
  return success(res, row);
});

router.post("/:quizId/start", auth, checkRole("teacher"), async (req, res) => {
  const row = await startQuiz(req.params.quizId, new Date().toISOString());
  if (!row) return error(res, "Quiz not found", 404);
  return success(res, row);
});

router.get("/:quizId", auth, async (req, res) => {
  const quiz = await getQuizWithQuestions(req.params.quizId);
  if (!quiz) return error(res, "Quiz not found", 404);
  return success(res, quiz);
});

router.post("/:quizId/submit", auth, checkRole("student"), async (req, res) => {
  const parsed = z.object({ answers: z.record(z.string(), z.string()) }).safeParse(req.body);
  if (!parsed.success) return error(res, "Validation error", 400, parsed.error.flatten());
  const quiz = await getQuizWithQuestions(req.params.quizId);
  if (!quiz) return error(res, "Quiz not found", 404);

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
  return success(res, { ...row, analytics: await getQuizAnalytics(req.params.quizId) });
});

router.get("/:quizId/analytics", auth, checkRole("teacher", "admin"), async (req, res) => {
  return success(res, await getQuizAnalytics(req.params.quizId));
});

export default router;
