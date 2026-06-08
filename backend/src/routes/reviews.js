import express from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { success, error } from "../utils/response.js";
import {
  createReview,
  listTeacherReviews,
  replyToReview,
  hasStudentAttendedTeacher
} from "../data/mediumStore.js";

const router = express.Router();

router.post("/", auth, checkRole("student"), async (req, res) => {
  const parsed = z.object({
    teacher_id: z.string().min(1),
    session_id: z.string().optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional()
  }).safeParse(req.body);
  if (!parsed.success) return error(res, "Validation error", 400, parsed.error.flatten());

  const allowed = await hasStudentAttendedTeacher(req.user.id, parsed.data.teacher_id);
  if (!allowed) return error(res, "You can only review teachers after attending", 403);

  const review = await createReview({
    id: `rv-${Date.now()}`,
    student_id: req.user.id,
    teacher_id: parsed.data.teacher_id,
    session_id: parsed.data.session_id || null,
    rating: parsed.data.rating,
    comment: parsed.data.comment || "",
    created_at: new Date().toISOString()
  });
  return success(res, review);
});

router.get("/teacher/:teacherId", auth, async (req, res) => {
  return success(res, await listTeacherReviews(req.params.teacherId));
});

router.post("/:id/respond", auth, checkRole("teacher"), async (req, res) => {
  const parsed = z.object({ teacher_reply: z.string().min(2).max(1000) }).safeParse(req.body);
  if (!parsed.success) return error(res, "Validation error", 400, parsed.error.flatten());
  const row = await replyToReview(req.params.id, req.user.id, parsed.data.teacher_reply);
  if (!row) return error(res, "Review not found", 404);
  return success(res, row);
});

export default router;
