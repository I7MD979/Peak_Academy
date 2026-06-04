import { sendEmail } from "../services/email.service.js";
import { supabase } from "../lib/supabase.js";
import { buildParentReport } from "../services/report.service.js";
import { getStudentReportForParent } from "../services/parentReportService.js";
import { publishNotification } from "../services/notificationHub.js";

export async function handleEmailJob(name, payload) {
  if (name === "enrollment-confirm") {
    const { studentEmail, sessionTitle, startTime } = payload;
    if (!studentEmail) return { skipped: true, reason: "missing_email" };

    const when = startTime
      ? new Date(startTime).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })
      : "قريباً";

    return sendEmail({
      to: studentEmail,
      subject: `تم تأكيد التسجيل — ${sessionTitle || "حصة Peak Academy"}`,
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif">
          <h2>تم تأكيد تسجيلك بنجاح</h2>
          <p>الحصة: <strong>${sessionTitle || "—"}</strong></p>
          <p>موعد البدء: <strong>${when}</strong></p>
          <p>نتمنى لك تجربة تعليمية ممتعة مع Peak Academy.</p>
        </div>
      `
    });
  }

  if (name === "weekly-report") {
    const { parentEmail, studentName, reportSummary } = payload;
    if (!parentEmail) return { skipped: true, reason: "missing_email" };

    return sendEmail({
      to: parentEmail,
      subject: `تقرير أسبوعي — ${studentName || "ابنك"}`,
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif">
          <h2>تقرير الأداء الأسبوعي</h2>
          <pre style="white-space:pre-wrap">${reportSummary || "لا توجد بيانات كافية بعد."}</pre>
        </div>
      `
    });
  }

  return { skipped: true, reason: "unknown_job" };
}

export async function handleReportJob(name, payload) {
  if (name !== "generate-parent-report") {
    return { skipped: true, reason: "unknown_job" };
  }

  const { parentId, studentId } = payload;
  if (!parentId || !studentId) return { skipped: true, reason: "missing_ids" };

  const report = await getStudentReportForParent(parentId, studentId);
  if (!report) return { skipped: true, reason: "report_not_found" };

  const built = buildParentReport(report);
  const reportId = `pr-${Date.now()}`;

  await supabase.from("parent_reports").insert({
    id: reportId,
    parent_id: parentId,
    student_id: studentId,
    mime_type: built.mimeType,
    storage_key: `generated:${reportId}`,
    generated_at: new Date().toISOString()
  });

  return { report_id: reportId, bytes: built.buffer.length };
}

export async function handleNotificationJob(name, payload) {
  if (name !== "push-notification") {
    return { skipped: true, reason: "unknown_job" };
  }

  const { userId, type, title, body, data } = payload;
  if (!userId || !title) return { skipped: true, reason: "missing_fields" };

  const id = `ntf-${Date.now()}`;
  const row = {
    id,
    user_id: userId,
    type: type || "general",
    title,
    body: body || "",
    is_read: false,
    created_at: new Date().toISOString()
  };

  await supabase.from("notifications").insert(row);
  publishNotification(userId, { ...row, data: data || null });
  return { notification_id: id };
}
