import { supabase } from "../lib/supabase.js";
import { calculateRefundAmount } from "../utils/refundCalculator.js";
import { enqueueJob } from "../lib/queue.js";
import { isSchemaV2 } from "../lib/schema.js";

async function processLegacyEnrollmentRefund(enrollment, session, cancelledAt, options = {}) {
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

async function processV2EnrollmentRefund(enrollment, session, cancelledAt, options = {}) {
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("enrollment_id", enrollment.id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) {
    return { refund_amount: 0, refund_id: null };
  }

  const fakeTxn = {
    amount: payment.amount,
    status: "completed",
    user_id: payment.student_id
  };
  const refundAmount = calculateRefundAmount(fakeTxn, session, cancelledAt, options);
  if (refundAmount <= 0) {
    return { refund_amount: 0, refund_id: null };
  }

  await supabase
    .from("payments")
    .update({
      status: "refunded",
      metadata: {
        ...(payment.metadata || {}),
        refund_amount: refundAmount,
        refunded_at: cancelledAt.toISOString()
      }
    })
    .eq("id", payment.id);

  return { refund_amount: refundAmount, refund_id: payment.id };
}

export async function processEnrollmentRefund(enrollment, session, cancelledAt, options = {}) {
  if (isSchemaV2()) {
    return processV2EnrollmentRefund(enrollment, session, cancelledAt, options);
  }
  return processLegacyEnrollmentRefund(enrollment, session, cancelledAt, options);
}

async function findEnrollmentForCancel(userId, sessionId) {
  if (isSchemaV2()) {
    const { data } = await supabase
      .from("enrollments")
      .select("*")
      .eq("session_id", sessionId)
      .eq("student_id", userId)
      .maybeSingle();
    return data;
  }

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!student) return null;

  const { data } = await supabase
    .from("session_enrollments")
    .select("*")
    .eq("session_id", sessionId)
    .eq("student_id", student.id)
    .maybeSingle();
  return data;
}

export async function cancelStudentEnrollment(userId, sessionId) {
  const enrollment = await findEnrollmentForCancel(userId, sessionId);

  if (!enrollment || ["cancelled", "refunded"].includes(enrollment.status)) {
    throw new Error("لا يوجد تسجيل نشط");
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, scheduled_at, start_time, status, teacher_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) throw new Error("الجلسة غير موجودة");
  if (session.status === "live" || session.status === "completed") {
    throw new Error("لا يمكن الإلغاء بعد بدء الجلسة");
  }

  const cancelledAt = new Date();
  const refund = await processEnrollmentRefund(enrollment, session, cancelledAt);

  const newStatus = isSchemaV2() ? "refunded" : "cancelled";
  await supabase
    .from(isSchemaV2() ? "enrollments" : "session_enrollments")
    .update(
      isSchemaV2()
        ? { status: newStatus, payment_status: refund.refund_amount > 0 ? "refunded" : enrollment.payment_status }
        : { status: "cancelled" }
    )
    .eq("id", enrollment.id);

  if (isSchemaV2() && ["confirmed", "pending"].includes(enrollment.status)) {
    await supabase.rpc("decrement_session_count", { p_session_id: sessionId }).catch(() => {});
  }

  const fundedBySubscription =
    isSchemaV2() &&
    !enrollment.payment_id &&
    enrollment.payment_status !== "paid" &&
    enrollment.metadata?.payment_type === "subscription";

  if (fundedBySubscription || (!isSchemaV2() && !enrollment.payment_id)) {
    const { data: sub } = await supabase
      .from("student_subscriptions")
      .select("id, sessions_remaining")
      .eq("student_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (sub && fundedBySubscription) {
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
    .select("id, scheduled_at, start_time, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { refunds: 0 };

  const table = isSchemaV2() ? "enrollments" : "session_enrollments";
  const activeStatuses = isSchemaV2() ? ["confirmed", "attended", "pending"] : ["enrolled", "attended"];

  const { data: enrollments } = await supabase
    .from(table)
    .select("*")
    .eq("session_id", sessionId)
    .in("status", activeStatuses);

  const cancelledAt = new Date();
  let refunds = 0;

  for (const enrollment of enrollments || []) {
    await processEnrollmentRefund(enrollment, session, cancelledAt, { teacherCancelled: true });

    await supabase
      .from(table)
      .update(isSchemaV2() ? { status: "refunded", payment_status: "refunded" } : { status: "cancelled" })
      .eq("id", enrollment.id);

    if (isSchemaV2() && ["confirmed", "pending"].includes(enrollment.status)) {
      await supabase.rpc("decrement_session_count", { p_session_id: sessionId }).catch(() => {});
    }

    const studentUserId = isSchemaV2() ? enrollment.student_id : null;
    let notifyUserId = studentUserId;

    if (!notifyUserId) {
      const { data: student } = await supabase
        .from("student_profiles")
        .select("user_id")
        .eq("id", enrollment.student_id)
        .maybeSingle();
      notifyUserId = student?.user_id;
    }

    if (notifyUserId) {
      await enqueueJob("notifications", "push-notification", {
        userId: notifyUserId,
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
