import { supabase } from "../lib/supabase.js";
import { enqueueJob } from "../lib/queue.js";
import { fulfillPaymentV2 } from "../utils/payments-fulfillment.js";
import { activateSubscriptionFromTransaction } from "./subscriptionService.js";
import { recordPromoUse } from "../utils/promoValidator.js";
import { completeOnboardingStep } from "./onboarding.service.js";

async function findPaymentForWebhook(orderId, provider) {
  const id = String(orderId);

  let { data: payment } = await supabase
    .from("payments")
    .select("*, enrollment:enrollment_id(id, session_id, student_id, status)")
    .eq("id", id)
    .eq("provider", provider)
    .maybeSingle();

  if (payment) return payment;

  ({ data: payment } = await supabase
    .from("payments")
    .select("*, enrollment:enrollment_id(id, session_id, student_id, status)")
    .eq("provider_order_id", id)
    .eq("provider", provider)
    .maybeSingle());

  if (payment) return payment;

  if (provider === "paymob" || provider === "vodafone_cash") {
    ({ data: payment } = await supabase
      .from("payments")
      .select("*, enrollment:enrollment_id(id, session_id, student_id, status)")
      .eq("paymob_order_id", id)
      .maybeSingle());
  }

  return payment;
}

async function markPaymentPaid(paymentId, transactionId, provider, existingPayment) {
  await supabase
    .from("payments")
    .update({
      status: "paid",
      provider_txn_id: transactionId,
      paymob_transaction_id:
        provider === "paymob" || provider === "vodafone_cash"
          ? transactionId
          : existingPayment.paymob_transaction_id,
      paid_at: new Date().toISOString()
    })
    .eq("id", paymentId)
    .eq("status", "pending");
}

async function fulfillSubscriptionPayment(payment, transactionId) {
  const meta = payment.metadata || {};
  const planId = meta.planId || meta.plan_id;
  if (!planId) return { type: "generic" };

  await markPaymentPaid(payment.id, transactionId, payment.provider, payment);

  const fakeTransaction = {
    user_id: payment.student_id,
    metadata: {
      plan_id: planId,
      bonus_sessions: meta.bonus_sessions || 0
    },
    paymob_order_id: payment.provider_order_id || payment.paymob_order_id,
    promotion_id: payment.promotion_id,
    discount_amount: payment.discount_amount || 0
  };

  const result = await activateSubscriptionFromTransaction(fakeTransaction);
  if (payment.promotion_id) {
    await recordPromoUse(payment.promotion_id, payment.student_id, null, payment.discount_amount || 0);
  }
  await completeOnboardingStep(payment.student_id, "first_payment").catch(() => {});
  return { type: "subscription", ...result };
}

export async function processProviderWebhook({ provider, result }) {
  const { orderId, transactionId, status } = result;

  if (status !== "success") {
    if (status === "failed" && orderId) {
      const payment = await findPaymentForWebhook(orderId, provider);
      if (payment?.status === "pending") {
        await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
      }
    }
    return { processed: false, reason: "not_success" };
  }

  const payment = await findPaymentForWebhook(orderId, provider);
  if (!payment) return { processed: false, reason: "payment_not_found" };
  if (payment.status === "paid") return { processed: true, duplicate: true };

  if (payment.enrollment_id && payment.enrollment) {
    await fulfillPaymentV2(payment, transactionId);
    await completeOnboardingStep(payment.student_id, "first_session").catch(() => {});
    return { processed: true, fulfillment: { type: "enrollment" } };
  }

  const meta = payment.metadata || {};
  if (meta.planId || meta.plan_id) {
    const fulfillment = await fulfillSubscriptionPayment(payment, transactionId);
    return { processed: true, fulfillment };
  }

  await markPaymentPaid(payment.id, transactionId, provider, payment);

  await enqueueJob("notifications", "push-notification", {
    userId: payment.student_id,
    type: "payment_success",
    title: "تم الدفع بنجاح",
    body: "تم تأكيد عملية الدفع.",
    data: { payment_id: payment.id }
  });

  return { processed: true, fulfillment: { type: "generic" } };
}

export async function verifyInstapayPayment({ paymentId, adminId, bankTransactionRef }) {
  const { data: payment } = await supabase
    .from("payments")
    .select("*, enrollment:enrollment_id(id, session_id, student_id, status)")
    .eq("id", paymentId)
    .eq("provider", "instapay")
    .maybeSingle();

  if (!payment) {
    const err = new Error("Payment not found");
    err.status = 404;
    throw err;
  }
  if (payment.status === "paid") {
    const err = new Error("Already paid");
    err.status = 400;
    throw err;
  }

  const { InstapayProvider } = await import("./payments/InstapayProvider.js");
  const provider = new InstapayProvider();
  const verification = await provider.verifyManually({
    orderId: paymentId,
    adminId,
    bankTransactionRef
  });

  await supabase
    .from("instapay_receipts")
    .update({
      status: "verified",
      verified_by: adminId,
      verified_at: new Date().toISOString(),
      bank_ref: bankTransactionRef || null
    })
    .eq("payment_id", paymentId)
    .eq("status", "pending");

  let fulfillment;
  if (payment.enrollment_id && payment.enrollment) {
    await fulfillPaymentV2(payment, verification.transactionId);
    fulfillment = { type: "enrollment" };
  } else if (payment.metadata?.planId || payment.metadata?.plan_id) {
    fulfillment = await fulfillSubscriptionPayment(payment, verification.transactionId);
  } else {
    await markPaymentPaid(payment.id, verification.transactionId, "instapay", payment);
    fulfillment = { type: "generic" };
  }

  return { success: true, fulfillment };
}
