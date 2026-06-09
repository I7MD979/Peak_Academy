import { supabase } from "../lib/supabase.js";
import { createPaymobOrder } from "./paymob.service.js";
import { validatePromoCode, applyPromoToPrice } from "../utils/promoValidator.js";
import { invalidateSubscriptionCaches } from "../lib/cache.js";

export async function listActivePlans() {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getPlanById(planId) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Fulfill a V2 `payments` row for subscription checkout (webhook or return sync). */
export async function activateSubscriptionFromPayment(payment, paymobTxnId = "") {
  if (!payment) return { activated: false };
  if (payment.status === "paid") return { activated: true, duplicate: true };

  const meta = payment.metadata || {};
  const planId = meta.planId || meta.plan_id;
  if (!planId) return { activated: false };

  const txnId = paymobTxnId ? String(paymobTxnId) : payment.paymob_transaction_id || payment.provider_txn_id || "";

  await supabase
    .from("payments")
    .update({
      status: "paid",
      paymob_transaction_id: txnId || payment.paymob_transaction_id,
      provider_txn_id: txnId || payment.provider_txn_id,
      paid_at: new Date().toISOString()
    })
    .eq("id", payment.id)
    .eq("status", "pending");

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
  if (payment.promotion_id && result.activated) {
    const { recordPromoUse } = await import("../utils/promoValidator.js");
    await recordPromoUse(payment.promotion_id, payment.student_id, null, payment.discount_amount || 0);
  }

  if (result.activated) {
    const { completeOnboardingStep } = await import("./onboarding.service.js");
    await completeOnboardingStep(payment.student_id, "first_payment").catch(() => {});
    await invalidateSubscriptionCaches(payment.student_id);

    // Record room attribution if student was in a teacher's room in the last 24h
    const subId = result.subscription?.id || result.subscription_id;
    if (subId) {
      const { recordSubscriptionAttribution } = await import("./roomAttribution.service.js");
      await recordSubscriptionAttribution(payment.student_id, subId);
    }
  }

  return result;
}

export async function activateSubscriptionFromTransaction(transaction) {
  const planId = transaction.metadata?.plan_id;
  if (!planId) return { activated: false };

  const plan = await getPlanById(planId);
  if (!plan) return { activated: false };

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  let sessionsRemaining = plan.sessions_per_month;
  const bonus = Number(transaction.metadata?.bonus_sessions || 0);
  sessionsRemaining += bonus;

  const { data: existing } = await supabase
    .from("student_subscriptions")
    .select("id")
    .eq("student_id", transaction.user_id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const { data: sub } = await supabase
      .from("student_subscriptions")
      .select("sessions_remaining")
      .eq("id", existing.id)
      .maybeSingle();
    await supabase
      .from("student_subscriptions")
      .update({
        plan_id: plan.id,
        sessions_remaining: (sub?.sessions_remaining || 0) + sessionsRemaining,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString()
      })
      .eq("id", existing.id);
    await invalidateSubscriptionCaches(transaction.user_id);
    return { activated: true, subscription_id: existing.id };
  }

  const { data: created, error } = await supabase
    .from("student_subscriptions")
    .insert({
      student_id: transaction.user_id,
      plan_id: plan.id,
      status: "active",
      sessions_remaining: sessionsRemaining,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      paymob_subscription_id: transaction.paymob_order_id || null
    })
    .select("*")
    .single();

  if (error) throw error;
  await invalidateSubscriptionCaches(transaction.user_id);
  return { activated: true, subscription: created };
}

export async function createSubscriptionPurchaseCheckout(user, planId, promoCode, frontendUrl) {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error("الخطة غير موجودة");

  let originalPrice = Number(plan.price);
  let discountAmount = 0;
  let finalPrice = originalPrice;
  let promotionId = null;
  let bonusSessions = 0;

  if (promoCode) {
    const validation = await validatePromoCode(promoCode, user.id, "subscription");
    if (!validation.valid) throw new Error(validation.reason);
    const applied = applyPromoToPrice(originalPrice, validation);
    discountAmount = applied.discountAmount;
    finalPrice = applied.finalPrice;
    promotionId = applied.promotionId;
    if (validation.bonus_sessions) bonusSessions = validation.bonus_sessions;
  }

  const amountCents = Math.round(finalPrice * 100);
  const returnUrl = `${frontendUrl}/student/subscription?paid=1`;
  const { checkoutUrl, orderId } = await createPaymobOrder(amountCents, user, { returnUrl });
  const transactionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { error: insertError } = await supabase.from("transactions").insert({
    id: transactionId,
    user_id: user.id,
    type: "subscription_payment",
    amount: finalPrice,
    original_amount: originalPrice,
    discount_amount: discountAmount,
    promotion_id: promotionId,
    paymob_order_id: orderId,
    status: "pending",
    metadata: { plan_id: planId, bonus_sessions: bonusSessions }
  });
  if (insertError) throw insertError;

  return {
    checkout_url: checkoutUrl,
    transaction_id: transactionId,
    plan
  };
}

export async function countPaidSessionEnrollments(userId) {
  const { isSchemaV2 } = await import("../lib/schema.js");
  if (isSchemaV2()) {
    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("payment_status", "paid")
      .in("status", ["confirmed", "attended"]);
    return count || 0;
  }

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const studentProfileId = student?.id;
  if (!studentProfileId) return 0;

  const { count } = await supabase
    .from("session_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentProfileId)
    .not("payment_id", "is", null)
    .in("status", ["enrolled", "attended"]);
  return count || 0;
}
