import express from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { success, error } from "../utils/response.js";
import { listStudentEnrollments } from "../data/coreStore.js";
import { upsertWeeklySubscription, createParentReport } from "../data/mediumStore.js";
import { runWeeklyDigestTick } from "../services/weeklyEmailScheduler.js";

const router = express.Router();

function buildReportText(studentId, rows) {
  const attended = rows.filter((r) => r.status === "attended" || r.status === "enrolled").length;
  const subjects = {};
  for (const row of rows) {
    const subject = row.sessions?.subject || "unknown";
    subjects[subject] = (subjects[subject] || 0) + 1;
  }
  const lines = [
    `Peak Academy Progress Report`,
    `Student: ${studentId}`,
    `Total sessions: ${rows.length}`,
    `Attended: ${attended}`,
    `Subject breakdown:`,
    ...Object.entries(subjects).map(([subject, count]) => `- ${subject}: ${count}`)
  ];
  return `${lines.join("\n")}\n`;
}

router.get("/parent/:studentId/pdf", auth, checkRole("parent", "admin"), async (req, res) => {
  const rows = await listStudentEnrollments(req.params.studentId);
  const text = buildReportText(req.params.studentId, rows);
  const buffer = Buffer.from(text, "utf8");
  const reportId = `pr-${Date.now()}`;

  await createParentReport({
    id: reportId,
    parent_id: req.user.id,
    student_id: req.params.studentId,
    mime_type: "application/pdf",
    storage_key: `inline:${reportId}`,
    generated_at: new Date().toISOString()
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.studentId}-weekly-report.pdf"`);
  return res.send(buffer);
});

router.post("/parent/weekly-email-subscriptions", auth, checkRole("parent"), async (req, res) => {
  const parsed = z.object({
    student_id: z.string().min(1),
    enabled: z.boolean().default(true),
    day_of_week: z.number().int().min(0).max(6).default(0),
    hour_utc: z.number().int().min(0).max(23).default(7)
  }).safeParse(req.body);
  if (!parsed.success) return error(res, "Validation error", 400, parsed.error.flatten());

  const row = await upsertWeeklySubscription({
    parent_id: req.user.id,
    student_id: parsed.data.student_id,
    enabled: parsed.data.enabled,
    day_of_week: parsed.data.day_of_week,
    hour_utc: parsed.data.hour_utc
  });
  return success(res, row);
});

router.post("/parent/weekly-email-run", auth, checkRole("admin"), async (req, res) => {
  const sent = await runWeeklyDigestTick();
  return success(res, { sent });
});

export default router;
