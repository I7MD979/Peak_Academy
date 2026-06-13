import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { supabase } from "../lib/supabase.js";
import { normalizeSubscriptionPlans } from "../lib/subscription-plans.js";
import { withCache } from "../lib/cache.js";
import { success, error } from "../utils/response.js";
import { validatePromoCodePublic, calculateDiscount } from "../utils/promoValidator.js";

const router = Router();

const publicPromoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "محاولات كثيرة — حاول بعد دقيقة" }
});

function promoLabel(promo) {
  if (!promo) return "";
  const value = Number(promo.discount_value || 0);
  if (promo.discount_type === "percent") return `خصم ${value}%`;
  if (promo.discount_type === "fixed") return `خصم ${value} جنيه`;
  if (promo.discount_type === "free_session") return "حصة مجانية";
  return "عرض خاص";
}

router.get("/landing", async (_req, res) => {
  try {
    const data = await withCache("public:landing", 60, async () => {
      const [plansRes, statsRes] = await Promise.all([
        supabase
          .from("subscription_plans")
          .select(
            "id, name, name_ar, price, sessions_per_month, features, is_featured, featured_label, sort_order"
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabase
          .from("platform_stats")
          .select("key, value, label, hint")
          .eq("is_visible", true)
          .order("sort_order", { ascending: true })
      ]);

      if (plansRes.error) throw plansRes.error;
      if (statsRes.error) throw statsRes.error;

      return {
        plans: normalizeSubscriptionPlans(plansRes.data || []),
        stats: statsRes.data || []
      };
    });

    return success(res, data);
  } catch (err) {
    console.error("[public] landing:", err?.message || err);
    return error(res, "تعذر تحميل بيانات الصفحة", 500);
  }
});

router.post("/validate-promo", publicPromoLimiter, async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim();
    const paymentTypeRaw = String(req.body?.payment_type || "subscription").trim();
    const paymentType =
      paymentTypeRaw === "per_session" || paymentTypeRaw === "pay_per_session"
        ? "pay_per_session"
        : "subscription";

    if (!code) return error(res, "أدخل كود الخصم", 400);

    const validation = await validatePromoCodePublic(code, paymentType);
    if (!validation.valid) {
      return success(res, { valid: false, message: validation.reason });
    }

    let message = promoLabel(validation);
    if (paymentType === "subscription") {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("price")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      const samplePrice = Number(plan?.price || 0);
      if (samplePrice > 0) {
        const discount = calculateDiscount(samplePrice, validation);
        const finalPrice = Math.max(0, samplePrice - discount);
        if (discount > 0) {
          message = `${message} — مثال: خصم ${discount.toLocaleString("ar-EG")} جنيه (سعر بعد الخصم ${finalPrice.toLocaleString("ar-EG")} جنيه)`;
        }
      }
    }

    return success(res, {
      valid: true,
      message,
      discount_type: validation.discount_type,
      applies_to: validation.applies_to
    });
  } catch (err) {
    console.error("[public] validate-promo:", err?.message || err);
    return error(res, "تعذر التحقق من الكود", 500);
  }
});

export default router;
