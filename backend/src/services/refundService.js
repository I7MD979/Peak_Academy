import { supabase } from "../lib/supabase.js";
import { calculateRefundAmount } from "../utils/refundCalculator.js";
import { enqueueJob } from "../lib/queue.js";

export async function processEnrollmentRefund(enrollment, session, cancelledAt, options = {}) {
  if (!enrollment.payment_id) {
    return { refund_amount: 0, refund_id: null };
  }

  const { data: payment } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", enrollment.payment_id)
    .maybeSingle();

  if (!payment || payment.status !== "completed") {
    return { refund_amount: 0, refund_id: null };
  }

  const refundAmount = calculateRefundAmount(payment, session, cancelledAt, options);
  if (refundAmount <= 0) {
    return { refund_amount: 0, refund_id: null };
  }

  const refundId = `rf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.from("transactions").insert({
    id: refundId,
    user_id: payment.user_id,
    type: "refund",
    amount: refundAmount,
    original_amount: payment.amount,
    status: "completed",
    metadata: {
      original_transaction_id: payment.id,
      session_id: session.id,
      enrollment_id: enrollment.id,
      paymob_refund_pending: true
    }
  });
  if (error) throw error;

  return { refund_amount: refundAmount, refund_id: refundId };
}

export async function cancelStudentEnrollment(userId, sessionId) {
  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!student) throw new Error("ملف الطالب غير موجود");

  const { data: enrollment } = await supabase
    .from("session_enrollments")
    .select("*")
    .eq("session_id", sessionId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (!enrollment || enrollment.status === "cancelled") {
    throw new Error("لا يوجد تسجيل نشط");
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, scheduled_at, status, teacher_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) throw new Error("الجلسة غير موجودة");
  if (session.status === "live" || session.status === "completed") {
    throw new Error("لا يمكن الإلغاء بعد بدء الجلسة");
  }

  const cancelledAt = new Date();
  const refund = await processEnrollmentRefund(enrollment, session, cancelledAt);

  await supabase
    .from("session_enrollments")
    .update({ status: "cancelled" })
    .eq("id", enrollment.id);

  if (!enrollment.payment_id) {
    const { data: sub } = await supabase
      .from("student_subscriptions")
      .select("id, sessions_remaining")
      .eq("student_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (sub) {
      await supabase
        .from("student_subscriptions")
        .update({ sessions_remaining: (sub.sessions_remaining || 0) + 1 })
        .eq("id", sub.id);
    }
  }

  return { enrollment_id: enrollment.id, ...refund };
}

export async function refundAllSessionEnrollments(sessionId) {
  const { data: session } = await supabase
    .from("sessions")
    .select("id, scheduled_at, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { refunds: 0 };

  const { data: enrollments } = await supabase
    .from("session_enrollments")
    .select("*")
    .eq("session_id", sessionId)
    .in("status", ["enrolled", "attended"]);

  const cancelledAt = new Date();
  let refunds = 0;

  for (const enrollment of enrollments || []) {
    await processEnrollmentRefund(enrollment, session, cancelledAt, { teacherCancelled: true });
    await supabase.from("session_enrollments").update({ status: "cancelled" }).eq("id", enrollment.id);

    const { data: student } = await supabase
      .from("student_profiles")
      .select("user_id")
      .eq("id", enrollment.student_id)
      .maybeSingle();

    if (student?.user_id) {
      await enqueueJob("notifications", "push-notification", {
        userId: student.user_id,
        type: "session_cancelled",
        title: "تم إلغاء الجلسة",
        body: "تم إلغاء الجلسة من المدرس وسيتم استرداد المبلغ",
        data: { session_id: sessionId }
      });
    }
    refunds += 1;
  }

  return { refunds };
}
