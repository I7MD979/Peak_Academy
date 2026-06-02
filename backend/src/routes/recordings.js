const express = require("express");
const { z } = require("zod");
const { auth, checkRole } = require("../middleware/auth");
const { ok, fail } = require("../utils/response");
const { createRecording, getRecording, canAccessRecording } = require("../data/growthStore");
const { enqueueJob } = require("../services/infra");

const router = express.Router();

router.post("/", auth, checkRole("teacher"), async (req, res) => {
  const parsed = z.object({
    session_id: z.string().min(1),
    storage_url: z.string().min(3),
    visibility: z.enum(["enrolled_only", "public", "private"]).default("enrolled_only")
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Validation error", parsed.error.flatten());

  const row = await createRecording({
    id: `rec-${Date.now()}`,
    session_id: parsed.data.session_id,
    teacher_id: req.user.id,
    storage_url: parsed.data.storage_url,
    visibility: parsed.data.visibility,
    created_at: new Date().toISOString()
  });

  const queue = await enqueueJob("process-recording", { recording_id: row.id });
  return ok(res, { recording: row, queue });
});

router.get("/:id/playback", auth, async (req, res) => {
  const row = await getRecording(req.params.id);
  if (!row) return fail(res, 404, "Recording not found");
  const allowed = await canAccessRecording(row, req.user);
  if (!allowed) return fail(res, 403, "Not allowed to access this recording");
  return ok(res, { playback_url: row.storage_url, visibility: row.visibility });
});

module.exports = router;
