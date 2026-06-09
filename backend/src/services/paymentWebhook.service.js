import { supabase } from "../lib/supabase.js";
import { enqueueJob } from "../lib/queue.js";
import { fulfillPaymentV2 } from "../utils/payments-fulfillment.js";
import { activateSubscriptionFromPayment } from "./subscriptionService.js";
import { completeOnboardingStep } from "./onboarding.service.js";
import { findPaymentByReference } from "../utils/payment-lookup.js";
import { checkReplayAttack } from "../utils/paymob-security.js";
import { markPaymentFailedV2 } from "../utils/payments-fulfillment.js";

function paymentAmountMatches(payment, amountCents) {
  if (amountCents == null || amountCents === "") return true;
  const expected = Math.round(Number(payment.amount) * 100);
  return Math.abs(expected - Number(amountCents)) <= 1;
}

async function findPaymentForWebhook(orderId, provider) {
  return findPaymentByReference(orderId, { provider });
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

  const result = await activateSubscriptionFromPayment(payment, transactionId);
  return { type: "subscription", ...result };
}

export async function processProviderWebhook({ provider, result }) {
  const { orderId, transactionId, status } = result;

  if (transactionId) {
    const replay = await checkReplayAttack(String(transactionId));
    if (replay?.isReplay) return { processed: true, duplicate: true, reason: "replay" };
  }

  if (status !== "success") {
    if (status === "failed" && orderId) {
      const payment = await findPaymentForWebhook(orderId, provider);
      if (payment?.status === "pending") {
        await markPaymentFailedV2(payment);
      }
    }
    return { processed: false, reason: "not_success" };
  }

  const payment = await findPaymentForWebhook(orderId, provider);
  if (!payment) return { processed: false, reason: "payment_not_found" };
  if (payment.status === "paid") return { processed: true, duplicate: true };

  if (!paymentAmountMatches(payment, result.amountCents ?? result.amount_cents)) {
    console.warn(`[webhook] amount mismatch payment=${payment.id} provider=${provider}`);
    return { processed: false, reason: "amount_mismatch" };
  }

  if (payment.enrollment_id) {
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
    .select("*")
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
  if (payment.enrollment_id) {
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
