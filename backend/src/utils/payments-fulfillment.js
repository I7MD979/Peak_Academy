import { supabase } from "../lib/supabase.js";
import { enqueueJob } from "../lib/queue.js";
import { invalidateSessionCaches } from "../lib/cache.js";
import { recordPromoUse } from "./promoValidator.js";
import { activateSubscriptionFromTransaction } from "../services/subscriptionService.js";
import { creditReferrerOnFirstPaidEnrollment } from "../services/referralService.js";

async function notifyEnrollment(transaction, sessionId) {
  const [{ data: user }, { data: session }] = await Promise.all([
    supabase.from("users").select("email, full_name").eq("id", transaction.user_id).maybeSingle(),
    supabase
      .from("sessions")
      .select("title, scheduled_at")
      .eq("id", sessionId)
      .maybeSingle()
  ]);

  await Promise.all([
    enqueueJob("email", "enrollment-confirm", {
      studentEmail: user?.email,
      studentName: user?.full_name,
      sessionTitle: session?.title,
      startTime: session?.scheduled_at,
      amountPaid: transaction.amount
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
  await notifyEnrollment(transaction, sessionId);

  return { enrolled: true };
}

export async function fulfillCompletedTransaction(transaction, paymobTxnId) {
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
  if (!transaction || transaction.status !== "pending") return;

  await supabase.from("transactions").update({ status: "failed" }).eq("id", transaction.id).eq("status", "pending");

  await enqueueJob("notifications", "push-notification", {
    userId: transaction.user_id,
    type: "payment_failed",
    title: "فشل الدفع",
    body: "تعذر إتمام عملية الدفع. يمكنك المحاولة مرة أخرى.",
    data: {
      session_id: transaction.metadata?.session_id || null,
      transaction_id: transaction.id
    }
  });
}
