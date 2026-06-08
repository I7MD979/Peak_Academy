import { supabase } from "../lib/supabase.js";
import { getCacheEntry, setCacheEntry, invalidate, CACHE } from "../lib/cache.js";
import { PaymentFactory } from "./payments/PaymentFactory.js";
import { activateSubscriptionFromPayment } from "./subscriptionService.js";

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

  const amount = Number(amountEgp);
  if (!amount || amount <= 0) {
    throw new Error("المبلغ غير صالح");
  }

  const amountCents = Math.round(amount * 100);
  const paymentMeta = {
    planId: planId || null,
    plan_id: planId || null,
    subscriptionId: subscriptionId || null,
    enrollmentId: enrollmentId || null,
    type: metadata.type || (planId ? "subscription_payment" : enrollmentId ? "session_payment" : "payment"),
    ...metadata
  };

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
      promotion_id: promotionId || null,
      metadata: paymentMeta
    })
    .select("*")
    .single();

  if (error) throw error;

  const paymentProvider = PaymentFactory.getProvider(provider);
  const result = await paymentProvider.createOrder({
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

export async function getPaymentStatus(paymentId, userId, { sync = false } = {}) {
  let { data: payment } = await supabase
    .from("payments")
    .select("*, enrollment:enrollment_id(id, session_id, student_id, status)")
    .eq("id", paymentId)
    .eq("student_id", userId)
    .maybeSingle();

  if (!payment) return null;

  const planId = payment.metadata?.planId || payment.metadata?.plan_id;
  const isSubscriptionPayment = Boolean(planId) && !payment.enrollment_id;

  if (sync && payment.status === "pending" && isSubscriptionPayment) {
    await activateSubscriptionFromPayment(payment);
    await invalidate(CACHE.studentSubscription(userId));

    const refreshed = await supabase
      .from("payments")
      .select("*, enrollment:enrollment_id(id, session_id, student_id, status)")
      .eq("id", paymentId)
      .eq("student_id", userId)
      .maybeSingle();
    payment = refreshed.data || payment;
  }

  let subscriptionActivated = false;
  if (isSubscriptionPayment && payment.status === "paid") {
    const { data: activeSub } = await supabase
      .from("student_subscriptions")
      .select("id")
      .eq("student_id", userId)
      .eq("status", "active")
      .maybeSingle();
    subscriptionActivated = Boolean(activeSub);
  }

  return {
    payment,
    paid: payment.status === "paid",
    enrolled: payment.enrollment?.status === "confirmed",
    subscription_activated: subscriptionActivated
  };
}
