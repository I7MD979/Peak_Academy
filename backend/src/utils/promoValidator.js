import { supabase } from "../lib/supabase.js";

const PAYMENT_TYPE_MAP = {
  pay_per_session: "per_session",
  subscription: "subscription",
  free_trial: "per_session"
};

export function calculateDiscount(originalPrice, promo) {
  const price = Number(originalPrice) || 0;
  if (!promo) return 0;
  if (promo.discount_type === "percent") {
    return (price * Number(promo.discount_value)) / 100;
  }
  if (promo.discount_type === "fixed") {
    return Math.min(Number(promo.discount_value), price);
  }
  if (promo.discount_type === "free_session") {
    return price;
  }
  return 0;
}

export async function countUserPromoUses(promotionId, userId) {
  const { count } = await supabase
    .from("promotion_uses")
    .select("*", { count: "exact", head: true })
    .eq("promotion_id", promotionId)
    .eq("user_id", userId);
  return count || 0;
}

export async function validatePromoCode(code, userId, paymentType) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalized) {
    return { valid: false, reason: "أدخل كود الخصم" };
  }

  const { data: promo, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("code", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!promo) return { valid: false, reason: "الكود غير موجود" };

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, reason: "انتهت صلاحية الكود" };
  }

  if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
    return { valid: false, reason: "الكود وصل للحد الأقصى" };
  }

  const userUses = await countUserPromoUses(promo.id, userId);
  if (userUses >= promo.per_user_limit) {
    return { valid: false, reason: "استخدمت هذا الكود من قبل" };
  }

  const mappedType = PAYMENT_TYPE_MAP[paymentType] || paymentType;
  if (promo.applies_to !== "all" && promo.applies_to !== mappedType) {
    return { valid: false, reason: "هذا الكود لا ينطبق على هذا النوع من الدفع" };
  }

  if (promo.type === "referral") {
    const referralOk = await validateReferralPromo(promo, userId, normalized);
    if (!referralOk.valid) return referralOk;
  }

  return { valid: true, ...promo };
}

async function validateReferralPromo(promo, userId, code) {
  const { data: ref } = await supabase
    .from("referral_codes")
    .select("owner_id, code")
    .eq("code", code)
    .maybeSingle();

  if (!ref) return { valid: false, reason: "كود الإحالة غير صالح" };
  if (ref.owner_id === userId) {
    return { valid: false, reason: "لا يمكنك استخدام كود الإحالة الخاص بك" };
  }
  return { valid: true };
}

export async function recordPromoUse(promotionId, userId, enrollmentId, discountApplied) {
  if (!promotionId) return;

  const { error: useError } = await supabase.from("promotion_uses").insert({
    promotion_id: promotionId,
    user_id: userId,
    enrollment_id: enrollmentId || null,
    discount_applied: Number(discountApplied) || 0
  });
  if (useError) throw useError;

  const { data: promo } = await supabase
    .from("promotions")
    .select("used_count")
    .eq("id", promotionId)
    .maybeSingle();

  if (promo) {
    await supabase
      .from("promotions")
      .update({ used_count: (promo.used_count || 0) + 1 })
      .eq("id", promotionId);
  }
}

export function applyPromoToPrice(originalPrice, promo) {
  const discount = calculateDiscount(originalPrice, promo);
  const finalPrice = Math.max(0, Number(originalPrice) - discount);
  return { discountAmount: discount, finalPrice, promotionId: promo.id };
}
