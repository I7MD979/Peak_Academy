import { Resend } from "resend";

let resend = null;

const FROM = process.env.RESEND_FROM || "Peak Academy <noreply@peak-academy.net>";

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function emailShell(bodyHtml) {
  return `
    <div dir="rtl" style="font-family:Cairo,Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px">
      <h2 style="color:#f5721a">Peak Academy</h2>
      ${bodyHtml}
      <p style="color:#888;font-size:12px;margin-top:24px">Peak Academy — peak-academy.net</p>
    </div>
  `;
}

function formatSessionDate(startTime) {
  if (!startTime) return "قريباً";
  return new Date(startTime).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export const sendEmail = async ({ to, subject, html }) => {
  const client = getResendClient();
  if (!client || !to) return { skipped: true };

  return client.emails.send({ from: FROM, to, subject, html });
};

export async function sendEnrollmentConfirmation({
  to,
  studentName,
  sessionTitle,
  startTime,
  isFree = false,
  amountPaid = 0
}) {
  const dateStr = formatSessionDate(startTime);
  const amountLabel = isFree || Number(amountPaid) <= 0 ? "مجاني" : `${amountPaid} جنيه`;

  return sendEmail({
    to,
    subject: `تأكيد حجز حصة: ${sessionTitle || "حصة Peak Academy"}`,
    html: emailShell(`
      <p>أهلاً ${studentName || ""}،</p>
      <p>تم تأكيد حجزك بنجاح!</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
        <p><strong>الحصة:</strong> ${sessionTitle || "—"}</p>
        <p><strong>الموعد:</strong> ${dateStr}</p>
        <p><strong>المبلغ:</strong> ${amountLabel}</p>
      </div>
      <p>نتمنى لك حصة مفيدة!</p>
    `)
  });
}

export async function sendSessionReminder({
  to,
  studentName,
  sessionTitle,
  startTime,
  roomUrl
}) {
  const dateStr = formatSessionDate(startTime);
  const joinBlock = roomUrl
    ? `<a href="${roomUrl}" style="display:inline-block;background:#f5721a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">ادخل الحصة</a>`
    : "";

  return sendEmail({
    to,
    subject: `تذكير: حصتك بعد ساعة — ${sessionTitle || "حصة Peak Academy"}`,
    html: emailShell(`
      <p>أهلاً ${studentName || ""}،</p>
      <p>حصتك <strong>${sessionTitle || "—"}</strong> هتبدأ بعد ساعة!</p>
      <p><strong>الموعد:</strong> ${dateStr}</p>
      ${joinBlock}
    `)
  });
}

export async function sendPaymentFailed({ to, studentName, sessionTitle }) {
  return sendEmail({
    to,
    subject: `فشل الدفع — ${sessionTitle || "حصة Peak Academy"}`,
    html: emailShell(`
      <p>أهلاً ${studentName || ""}،</p>
      <p>للأسف فشلت عملية الدفع لحصة <strong>${sessionTitle || "—"}</strong>.</p>
      <p>يرجى المحاولة مرة أخرى أو استخدام طريقة دفع مختلفة.</p>
      <a href="https://peak-academy.net/sessions" style="display:inline-block;background:#f5721a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">حاول مرة أخرى</a>
    `)
  });
}

export async function sendDunningEmail({ to, name, attempt, isLastAttempt, renewUrl }) {
  const urgency = isLastAttempt
    ? "هذه آخر تذكير — سيتم إيقاف اشتراكك قريباً إذا لم تُجدد."
    : `تذكير ${attempt} من 3 — يرجى تجديد اشتراكك لتجنب انقطاع الخدمة.`;

  return sendEmail({
    to,
    subject: isLastAttempt ? "⚠️ آخر تذكير — اشتراك Peak Academy" : "تذكير تجديد الاشتراك — Peak Academy",
    html: emailShell(`
      <p>أهلاً ${name || ""}،</p>
      <p>${urgency}</p>
      <a href="${renewUrl || "https://peak-academy.net/student/subscription"}" style="display:inline-block;background:#f5721a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">جدّد اشتراكك الآن</a>
    `)
  });
}

export async function sendWithdrawalProcessed({ to, teacherName, amount, status }) {
  const approved = status === "approved" || status === "paid";
  const statusText = approved
    ? "تمت الموافقة عليه وجاري التحويل"
    : "تم رفضه";

  return sendEmail({
    to,
    subject: `تحديث طلب السحب — ${approved ? "تمت الموافقة" : "مرفوض"}`,
    html: emailShell(`
      <p>أهلاً ${teacherName || ""}،</p>
      <p>طلب سحب <strong>${amount} جنيه</strong> ${statusText}.</p>
    `)
  });
}
