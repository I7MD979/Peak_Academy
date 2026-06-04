const express = require("express");
const { z } = require("zod");
const { auth, checkRole } = require("../middleware/auth");
const { ok, fail } = require("../utils/response");
const { createReview, listTeacherReviews, replyToReview, hasStudentAttendedTeacher } = require("../data/mediumStore");

const router = express.Router();

router.post("/", auth, checkRole("student"), async (req, res) => {
  const parsed = z.object({
    teacher_id: z.string().min(1),
    session_id: z.string().optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Validation error", parsed.error.flatten());

  const allowed = await hasStudentAttendedTeacher(req.user.id, parsed.data.teacher_id);
  if (!allowed) return fail(res, 403, "You can only review teachers after attending");

  const review = await createReview({
    id: `rv-${Date.now()}`,
    student_id: req.user.id,
    teacher_id: parsed.data.teacher_id,
    session_id: parsed.data.session_id || null,
    rating: parsed.data.rating,
    comment: parsed.data.comment || "",
    created_at: new Date().toISOString()
  });
  return ok(res, review);
});

router.get("/teacher/:teacherId", auth, async (req, res) => {
  return ok(res, await listTeacherReviews(req.params.teacherId));
});

router.post("/:id/respond", auth, checkRole("teacher"), async (req, res) => {
  const parsed = z.object({ teacher_reply: z.string().min(2).max(1000) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Validation error", parsed.error.flatten());
  const row = await replyToReview(req.params.id, req.user.id, parsed.data.teacher_reply);
  if (!row) return fail(res, 404, "Review not found");
  return ok(res, row);
});

module.exports = router;
