import { supabase } from "../lib/supabase.js";
import {
  sendEnrollmentConfirmation,
  sendSessionReminder,
  sendPaymentFailed,
  sendWithdrawalProcessed
} from "../services/email.service.js";
import { buildParentReport } from "../services/report.service.js";
import { getStudentReportForParent } from "../services/parentReportService.js";
import { createUserNotification } from "../services/notification.service.js";

function resolveEmail(payload) {
  return payload.to || payload.studentEmail || payload.parentEmail || null;
}

export async function handleNotificationJob(name, payload) {
  if (name !== "push-notification") {
    return { skipped: true, reason: "unknown_job" };
  }

  const { userId, type, title, body, data } = payload;
  if (!userId || !title) return { skipped: true, reason: "missing_fields" };

  const row = await createUserNotification({
    userId,
    type: type || "general",
    title,
    body: body || "",
    data
  });

  return { notification_id: row.id };
}

export async function handleEmailJob(name, payload) {
  if (name === "enrollment-confirm") {
    const to = resolveEmail(payload);
    if (!to) return { skipped: true, reason: "missing_email" };

    const amountPaid = payload.amountPaid ?? payload.amount ?? 0;
    const isFree =
      payload.isFree === true ||
      payload.is_free === true ||
      Number(amountPaid) <= 0;

    return sendEnrollmentConfirmation({
      to,
      studentName: payload.studentName || payload.student_name,
      sessionTitle: payload.sessionTitle || payload.session_title,
      startTime: payload.startTime || payload.start_time,
      isFree,
      amountPaid
    });
  }

  if (name === "session-reminder") {
    const to = resolveEmail(payload);
    if (!to) return { skipped: true, reason: "missing_email" };

    return sendSessionReminder({
      to,
      studentName: payload.studentName || payload.student_name,
      sessionTitle: payload.sessionTitle || payload.session_title,
      startTime: payload.startTime || payload.start_time,
      roomUrl: payload.roomUrl || payload.room_url
    });
  }

  if (name === "payment-failed") {
    const to = resolveEmail(payload);
    if (!to) return { skipped: true, reason: "missing_email" };

    return sendPaymentFailed({
      to,
      studentName: payload.studentName || payload.student_name,
      sessionTitle: payload.sessionTitle || payload.session_title
    });
  }

  if (name === "withdrawal-processed") {
    const to = resolveEmail(payload);
    if (!to) return { skipped: true, reason: "missing_email" };

    return sendWithdrawalProcessed({
      to,
      teacherName: payload.teacherName || payload.teacher_name,
      amount: payload.amount,
      status: payload.status
    });
  }

  if (name === "weekly-report") {
    const to = resolveEmail(payload);
    if (!to) return { skipped: true, reason: "missing_email" };

    const { sendEmail } = await import("../services/email.service.js");
    const { studentName, reportSummary } = payload;

    return sendEmail({
      to,
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
  const studentUserId = report.student.user_id;

  if (!studentUserId) return { skipped: true, reason: "missing_student_user_id" };

  await supabase.from("parent_reports").insert({
    id: reportId,
    parent_id: parentId,
    student_id: studentUserId,
    mime_type: built.mimeType,
    storage_key: `generated:${reportId}`,
    generated_at: new Date().toISOString()
  });

  return { report_id: reportId, bytes: built.buffer.length };
}
