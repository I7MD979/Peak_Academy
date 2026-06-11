import { supabase } from "../lib/supabase.js";
import { getCacheEntry, setCacheEntry, invalidate, CACHE } from "../lib/cache.js";
import { PaymentFactory } from "./payments/PaymentFactory.js";
import { findPaymentForStudent } from "../utils/payment-lookup.js";
import { fulfillPaymentV2 } from "../utils/payments-fulfillment.js";
import {
  activateSubscriptionFromPayment,
  resolveSubscriptionOrderPricing
} from "./subscriptionService.js";

export { findPaymentForStudent };

const IDEM_TTL = 600;

export async function createPaymentOrder({
  user,
  provider = "paymob",
  amountEgp,
  planId,
  subscriptionId,
  enrollmentId,
  promotionId,
  metadata = {},
  idempotencyKey
}) {
  const supported = PaymentFactory.getSupportedProviders();
  if (!supported.includes(provider)) {
    const err = new Error(`Provider must be one of: ${supported.join(", ")}`);
    err.code = "INVALID_PROVIDER";
    throw err;
  }

  const cacheKey = `payment:idem:${idempotencyKey}`;
  const cached = await getCacheEntry(cacheKey);
  if (cached) return cached;

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .maybeSingle();

  let amount = Number(amountEgp);
  let resolvedPromotionId = null;
  let discountAmount = 0;
  const promoCode = metadata.promo_code || metadata.promoCode || null;

  const paymentMeta = {
    planId: planId || null,
    plan_id: planId || null,
    subscriptionId: subscriptionId || null,
    enrollmentId: enrollmentId || null,
    type: metadata.type || (planId ? "subscription_payment" : enrollmentId ? "session_payment" : "payment"),
    ...metadata
  };

  if (planId) {
    const pricing = await resolveSubscriptionOrderPricing(user, planId, promoCode);
    discountAmount = pricing.discountAmount;
    amount = pricing.finalPrice;
    resolvedPromotionId = pricing.promotionId;
    paymentMeta.bonus_sessions = pricing.bonusSessions;
    paymentMeta.original_amount = pricing.originalPrice;
    paymentMeta.discount_amount = pricing.discountAmount;
    if (amountEgp != null && Math.abs(Number(amountEgp) - amount) > 0.02) {
      const err = new Error("المبلغ لا يطابق سعر الخطة");
      err.code = "AMOUNT_MISMATCH";
      throw err;
    }
  } else if (!amount || amount <= 0) {
    throw new Error("المبلغ غير صالح");
  }

  const amountCents = Math.round(amount * 100);

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      student_id: user.id,
      enrollment_id: enrollmentId || null,
      amount,
      provider,
      payment_method: provider,
      status: "pending",
      idempotency_key: idempotencyKey,
      promotion_id: resolvedPromotionId || promotionId || null,
      discount_amount: discountAmount || null,
      metadata: paymentMeta
    })
    .select("*")
    .single();

  if (error) throw error;

  let result;
  try {
    const paymentProvider = PaymentFactory.getProvider(provider);
    result = await paymentProvider.createOrder({
    amount: amountCents,
    orderId: payment.id,
    userId: user.id,
    customer: {
      name: profile?.full_name || user.full_name || "Customer",
      email: profile?.email || user.email,
      phone: profile?.phone || user.phone
    },
    metadata: paymentMeta
    });
  } catch (providerErr) {
    await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id).eq("status", "pending");
    throw providerErr;
  }

  const providerOrderId = result.providerOrderId;
  await supabase
    .from("payments")
    .update({
      provider_order_id: providerOrderId,
      paymob_order_id: provider === "paymob" || provider === "vodafone_cash" ? providerOrderId : payment.paymob_order_id,
      metadata: { ...paymentMeta, providerResult: result }
    })
    .eq("id", payment.id);

  const responseData = {
    success: true,
    data: {
      paymentId: payment.id,
      provider,
      providerOrderId,
      iframeUrl: result.iframeUrl,
      paymentUrl: result.paymentUrl,
      referenceCode: result.referenceCode,
      ipaAlias: result.ipaAlias,
      amountEGP: result.amountEGP || amount.toFixed(2),
      expiresAt: result.expiresAt,
      instructions: result.instructions,
      paymentMethod: result.paymentMethod
    }
  };

  await setCacheEntry(cacheKey, IDEM_TTL, responseData);
  return responseData;
}

async function syncPendingPaymentFromProvider(payment) {
  const providerName = payment.provider || "paymob";
  const providerOrderId = payment.provider_order_id || payment.paymob_order_id;
  if (!providerOrderId) return payment;

  try {
    const provider = PaymentFactory.getProvider(providerName);
    if (!provider.getTransactionStatus) return payment;

    const remote = await provider.getTransactionStatus(providerOrderId);
    if (remote.status === "success") {
      await fulfillPaymentV2(payment, remote.transactionId);
      const { data: refreshed } = await supabase
        .from("payments")
        .select("*")
        .eq("id", payment.id)
        .maybeSingle();
      return refreshed || payment;
    }
    if (remote.status === "failed") {
      await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id).eq("status", "pending");
      const { data: refreshed } = await supabase
        .from("payments")
        .select("*")
        .eq("id", payment.id)
        .maybeSingle();
      return refreshed || payment;
    }
  } catch (err) {
    console.warn("[payment-sync] provider status check failed:", err.message);
  }

  return payment;
}

export async function getPaymentStatus(paymentId, userId, { sync = false } = {}) {
  let payment = await findPaymentForStudent(paymentId, userId);
  if (!payment) return null;

  const planId = payment.metadata?.planId || payment.metadata?.plan_id;
  const isSubscriptionPayment = Boolean(planId) && !payment.enrollment_id;

  if (sync && payment.status === "pending") {
    payment = await syncPendingPaymentFromProvider(payment);
    if (payment.status !== "pending") {
      await invalidate(CACHE.studentSubscription(userId));
    }
  }

  let subscriptionActivated = false;
  if (isSubscriptionPayment && payment.status === "paid") {
    const fulfilledId = payment.metadata?.fulfilled_subscription_id;
    if (fulfilledId) {
      const { data: sub } = await supabase
        .from("student_subscriptions")
        .select("id")
        .eq("id", fulfilledId)
        .maybeSingle();
      subscriptionActivated = Boolean(sub);
    }
    if (!subscriptionActivated) {
      const recovery = await activateSubscriptionFromPayment(payment).catch(() => ({ activated: false }));
      subscriptionActivated = Boolean(recovery.activated);
    }
  }

  let enrolled = false;
  if (payment.enrollment_id && payment.status === "paid") {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("status")
      .eq("id", payment.enrollment_id)
      .maybeSingle();
    enrolled = enr?.status === "confirmed";
    if (!enrolled) {
      const recovery = await fulfillPaymentV2(payment).catch(() => ({ enrolled: false }));
      enrolled = Boolean(recovery.enrolled);
    }
  }

  return {
    payment,
    paid: payment.status === "paid",
    enrolled,
    subscription_activated: subscriptionActivated
  };
}
