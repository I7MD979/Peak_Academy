import express from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { success, error } from "../utils/response.js";
import { createRecording, getRecording, canAccessRecording } from "../data/growthStore.js";
import { enqueueJob } from "../services/infra.js";

const router = express.Router();

router.post("/", auth, checkRole("teacher"), async (req, res) => {
  const parsed = z.object({
    session_id: z.string().min(1),
    storage_url: z.string().min(3),
    visibility: z.enum(["enrolled_only", "public", "private"]).default("enrolled_only")
  }).safeParse(req.body);
  if (!parsed.success) return error(res, "Validation error", 400, parsed.error.flatten());

  const row = await createRecording({
    id: `rec-${Date.now()}`,
    session_id: parsed.data.session_id,
    teacher_id: req.user.id,
    storage_url: parsed.data.storage_url,
    visibility: parsed.data.visibility,
    created_at: new Date().toISOString()
  });

  const queue = await enqueueJob("process-recording", { recording_id: row.id });
  return success(res, { recording: row, queue });
});

router.get("/:id/playback", auth, async (req, res) => {
  const row = await getRecording(req.params.id);
  if (!row) return error(res, "Recording not found", 404);
  const allowed = await canAccessRecording(row, req.user);
  if (!allowed) return error(res, "Not allowed to access this recording", 403);
  return success(res, { playback_url: row.storage_url, visibility: row.visibility });
});

export default router;
