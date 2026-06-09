import { supabase } from "../lib/supabase.js";
import { enqueueJob } from "../lib/queue.js";
import { recordPromoUse } from "./promoValidator.js";
import {
  activateSubscriptionFromTransaction,
  activateSubscriptionFromPayment
} from "../services/subscriptionService.js";
import { creditReferrerOnFirstPaidEnrollment } from "../services/referralService.js";
import { isSchemaV2 } from "../lib/schema.js";
import { findPaymentByPaymobOrder, fulfillPayment } from "../data/enrollmentRepository.js";
import { invalidateSessionCaches, invalidateStudentCaches } from "../lib/cache.js";
import { notifyEnrollmentConfirm } from "../services/enrollmentService.js";

async function notifyEnrollmentLegacy(transaction, sessionId) {
  const [{ data: user }, { data: session }] = await Promise.all([
    supabase.from("users").select("email, full_name").eq("id", transaction.user_id).maybeSingle(),
    supabase
      .from("sessions")
      .select("title, scheduled_at, start_time")
      .eq("id", sessionId)
      .maybeSingle()
  ]);

  await Promise.all([
    enqueueJob("email", "enrollment-confirm", {
      studentEmail: user?.email,
      studentName: user?.full_name,
      sessionTitle: session?.title,
      startTime: session?.start_time ?? session?.scheduled_at,
      amountPaid: transaction.amount,
      isFree: Number(transaction.amount) <= 0
    }),
    enqueueJob("notifications", "push-notification", {
      userId: transaction.user_id,
      type: "enrollment",
      title: "تم تأكيد التسجيل",
      body: `تم تأكيد تسجيلك في ${session?.title || "الحصة"}`,
      data: { session_id: sessionId }
    })
  ]);
}

export async function fulfillPaymentV2(payment, paymobTxnId) {
  if (payment.status !== "pending") {
    return { ok: true, duplicate: payment.status === "paid" };
  }

  const meta = payment.metadata || {};
  const planId = meta.planId || meta.plan_id;
  if (planId && !payment.enrollment_id) {
    const subResult = await activateSubscriptionFromPayment(payment, paymobTxnId);
    return { ok: true, subscription_activated: Boolean(subResult.activated) };
  }

  const result = await fulfillPayment(payment, paymobTxnId);
  if (!result?.enrolled) return result;

  const enrollment = result.enrollment || payment.enrollment;
  const sessionId = enrollment?.session_id;
  if (payment.promotion_id && enrollment?.id) {
    await recordPromoUse(
      payment.promotion_id,
      payment.student_id,
      enrollment.id,
      payment.discount_amount
    );
    await supabase.rpc("increment_used_count", { promo_id: payment.promotion_id });
    await creditReferrerOnFirstPaidEnrollment(payment.student_id, payment.promotion_id);
  }

  if (sessionId) {
    await notifyEnrollmentConfirm(payment.student_id, sessionId, payment.amount);
  }
  return { enrolled: true, ok: true };
}

async function enqueuePaymentFailedEmail({ userId, sessionId }) {
  if (!userId) return;

  const [{ data: user }, { data: session }] = await Promise.all([
    supabase.from("users").select("email, full_name").eq("id", userId).maybeSingle(),
    sessionId
      ? supabase.from("sessions").select("title").eq("id", sessionId).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  if (!user?.email) return;

  await enqueueJob("email", "payment-failed", {
    to: user.email,
    studentName: user.full_name,
    sessionTitle: session?.title
  });
}

export async function markPaymentFailedV2(payment) {
  if (!payment || payment.status !== "pending") return;

  await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id).eq("status", "pending");

  let sessionId = payment.enrollment?.session_id;
  if (!sessionId && payment.enrollment_id) {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("session_id")
      .eq("id", payment.enrollment_id)
      .maybeSingle();
    sessionId = enr?.session_id || null;
  }
  if (payment.enrollment_id) {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("status, session_id")
      .eq("id", payment.enrollment_id)
      .maybeSingle();
    if (enr?.status === "confirmed") {
      await supabase.rpc("decrement_session_count", { p_session_id: enr.session_id }).catch(() => {});
    }
    await supabase
      .from("enrollments")
      .update({ status: "cancelled", payment_status: "failed" })
      .eq("id", payment.enrollment_id)
      .in("status", ["pending", "confirmed"]);
  }

  await Promise.all([
    enqueueJob("notifications", "push-notification", {
      userId: payment.student_id,
      type: "payment_failed",
      title: "فشل الدفع",
      body: "تعذر إتمام عملية الدفع. يمكنك المحاولة مرة أخرى.",
      data: { session_id: sessionId || null }
    }),
    enqueuePaymentFailedEmail({
      userId: payment.student_id,
      sessionId: sessionId || payment.enrollment?.session?.id
    })
  ]);
}

export async function reconcileCompletedTransaction(transaction) {
  if (!transaction || transaction.status !== "completed") {
    return { reconciled: false };
  }

  if (transaction.type === "subscription_payment") {
    const result = await activateSubscriptionFromTransaction(transaction);
    if (transaction.promotion_id) {
      await recordPromoUse(transaction.promotion_id, transaction.user_id, null, transaction.discount_amount);
    }
    return { subscription_activated: result.activated };
  }

  if (transaction.type === "question_payment") {
    const { subject, content } = transaction.metadata || {};
    if (!subject || !content) return { question_created: false };

    const questionId = `q-${transaction.id}`;
    const { data: existing } = await supabase
      .from("questions")
      .select("id")
      .eq("id", questionId)
      .maybeSingle();

    if (existing) return { question_created: true, duplicate: true };

    const { error: questionError } = await supabase.from("questions").insert({
      id: questionId,
      student_id: transaction.user_id,
      subject,
      content,
      status: "unanswered"
    });

    if (questionError) throw questionError;
    return { question_created: true };
  }

  const sessionId = transaction.metadata?.session_id;
  if (transaction.type !== "session_payment" || !sessionId) {
    return { enrolled: false };
  }

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", transaction.user_id)
    .maybeSingle();

  if (!student) return { enrolled: false };

  const { data: existing } = await supabase
    .from("session_enrollments")
    .select("id")
    .eq("session_id", sessionId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (existing) return { enrolled: true, duplicate: true };

  const { count: enrolledCount } = await supabase
    .from("session_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .in("status", ["enrolled", "attended"]);

  const { data: session } = await supabase
    .from("sessions")
    .select("max_students, title, scheduled_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (session && enrolledCount >= session.max_students) {
    return { enrolled: false, reason: "session_full" };
  }

  const { error: enrollError } = await supabase.from("session_enrollments").insert({
    id: `en-${transaction.id}`,
    session_id: sessionId,
    student_id: student.id,
    payment_id: transaction.id,
    status: "enrolled"
  });

  if (enrollError) throw enrollError;

  if (transaction.promotion_id) {
    await recordPromoUse(
      transaction.promotion_id,
      transaction.user_id,
      `en-${transaction.id}`,
      transaction.discount_amount
    );
    await creditReferrerOnFirstPaidEnrollment(transaction.user_id, transaction.promotion_id);
  }

  await invalidateSessionCaches(sessionId);
  await invalidateStudentCaches(transaction.user_id);
  await notifyEnrollmentLegacy(transaction, sessionId);

  return { enrolled: true };
}

export async function fulfillCompletedTransaction(transaction, paymobTxnId) {
  if (isSchemaV2()) {
    const payment = transaction.enrollment ? transaction : null;
    if (payment?.id && payment.enrollment_id !== undefined) {
      return fulfillPaymentV2(payment, paymobTxnId);
    }
    return { reconciled: false };
  }

  if (!transaction) return { reconciled: false };

  if (transaction.status === "completed") {
    return reconcileCompletedTransaction(transaction);
  }

  const { data: updated, error: updateError } = await supabase
    .from("transactions")
    .update({
      status: "completed",
      paymob_txn_id: paymobTxnId ? String(paymobTxnId) : transaction.paymob_txn_id
    })
    .eq("id", transaction.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (updateError) throw updateError;

  if (updated) {
    return reconcileCompletedTransaction(updated);
  }

  const { data: current } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transaction.id)
    .maybeSingle();

  if (current?.status === "completed") {
    return reconcileCompletedTransaction(current);
  }

  return { reconciled: false };
}

export async function markTransactionFailed(transaction) {
  if (isSchemaV2() && transaction?.enrollment_id !== undefined) {
    return markPaymentFailedV2(transaction);
  }

  if (!transaction || transaction.status !== "pending") return;

  await supabase.from("transactions").update({ status: "failed" }).eq("id", transaction.id).eq("status", "pending");

  const sessionId = transaction.metadata?.session_id || null;

  await Promise.all([
    enqueueJob("notifications", "push-notification", {
      userId: transaction.user_id,
      type: "payment_failed",
      title: "فشل الدفع",
      body: "تعذر إتمام عملية الدفع. يمكنك المحاولة مرة أخرى.",
      data: {
        session_id: sessionId,
        transaction_id: transaction.id
      }
    }),
    enqueuePaymentFailedEmail({ userId: transaction.user_id, sessionId })
  ]);
}

export async function handlePaymobWebhook(orderId, paymobTxnId, success, extraOrderId = "") {
  const payment = await findPaymentByPaymobOrder(orderId);
  const paymentFromMerchant =
    !payment && extraOrderId ? await findPaymentByPaymobOrder(extraOrderId) : null;
  const resolvedPayment = payment?._legacyTransaction ? null : payment || paymentFromMerchant;

  if (resolvedPayment) {
    if (resolvedPayment.status !== "pending") {
      return { processed: true, ok: true };
    }

    if (!success) {
      await markPaymentFailedV2(resolvedPayment);
      return { processed: true, ok: true };
    }

    await fulfillPaymentV2(resolvedPayment, paymobTxnId);
    return { processed: true, ok: true };
  }

  const legacy = payment?._legacyTransaction;
  const { findLegacyTransactionByReference } = await import("./payment-lookup.js");
  const transaction =
    legacy ||
    (await findLegacyTransactionByReference(orderId)) ||
    (extraOrderId ? await findLegacyTransactionByReference(extraOrderId) : null);

  if (!transaction) return { processed: false, ok: true };
  if (transaction.status !== "pending") return { processed: true, ok: true };

  if (!success) {
    await markTransactionFailed(transaction);
    return { processed: true, ok: true };
  }

  await fulfillCompletedTransaction(transaction, paymobTxnId);
  return { processed: true, ok: true };
}
