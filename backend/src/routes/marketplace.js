import express from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { success, error } from "../utils/response.js";
import {
  getQuestionPricing,
  upsertQuestionPricing,
  createMarketplaceRoute,
  listTeacherRoutes
} from "../data/growthStore.js";

const router = express.Router();

router.post("/pricing", auth, checkRole("admin"), async (req, res) => {
  const parsed = z.object({
    subject: z.string().min(2),
    grade: z.enum(["first", "second", "third"]),
    amount: z.number().min(0)
  }).safeParse(req.body);
  if (!parsed.success) return error(res, "Validation error", 400, parsed.error.flatten());
  const row = await upsertQuestionPricing({ ...parsed.data, is_active: true });
  return success(res, row);
});

router.get("/pricing", auth, async (req, res) => {
  const parsed = z.object({
    subject: z.string().min(2),
    grade: z.enum(["first", "second", "third"])
  }).safeParse(req.query);
  if (!parsed.success) return error(res, "Validation error", 400, parsed.error.flatten());
  const row = await getQuestionPricing(parsed.data.subject, parsed.data.grade);
  return success(res, row || { amount: 0, is_active: false });
});

router.post("/route-question", auth, checkRole("student", "admin"), async (req, res) => {
  const parsed = z.object({
    question_id: z.string().optional(),
    teacher_id: z.string().min(1)
  }).safeParse(req.body);
  if (!parsed.success) return error(res, "Validation error", 400, parsed.error.flatten());

  const row = await createMarketplaceRoute({
    id: `mr-${Date.now()}`,
    student_id: req.user.id,
    question_id: parsed.data.question_id || null,
    teacher_id: parsed.data.teacher_id,
    status: "assigned",
    created_at: new Date().toISOString()
  });
  return success(res, row);
});

router.get("/teacher-routes", auth, checkRole("teacher"), async (req, res) => {
  return success(res, await listTeacherRoutes(req.user.id));
});

export default router;
