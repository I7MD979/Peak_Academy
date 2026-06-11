import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { normalizeSubscriptionPlans } from "../lib/subscription-plans.js";
import { withCache } from "../lib/cache.js";
import { success, error } from "../utils/response.js";

const router = Router();

function promoLabel(promo) {
  if (!promo) return "";
  const value = Number(promo.discount_value || 0);
  if (promo.discount_type === "percent") return `خصم ${value}%`;
  if (promo.discount_type === "fixed") return `خصم ${value} جنيه`;
  if (promo.discount_type === "free_session") return "حصة مجانية";
  return `عرض ${promo.code}`;
}

router.get("/landing", async (_req, res) => {
  try {
    const data = await withCache("public:landing", 300, async () => {
      const now = new Date().toISOString();

      const [plansRes, statsRes, promosRes] = await Promise.all([
        supabase
          .from("subscription_plans")
          .select("id, name, price, sessions_per_month, features, is_featured, featured_label, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabase
          .from("platform_stats")
          .select("key, value, label, hint")
          .eq("is_visible", true)
          .order("sort_order", { ascending: true }),

        supabase
          .from("promotions")
          .select("code, discount_type, discount_value")
          .eq("is_active", true)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .limit(5)
      ]);

      if (plansRes.error) throw plansRes.error;
      if (statsRes.error) throw statsRes.error;
      if (promosRes.error) throw promosRes.error;

      return {
        plans: normalizeSubscriptionPlans(plansRes.data || []),
        stats: statsRes.data || [],
        promos: (promosRes.data || []).map((p) => ({
          code: p.code,
          label: promoLabel(p)
        }))
      };
    });

    return success(res, data);
  } catch (err) {
    console.error("[public] landing:", err?.message || err);
    return error(res, "تعذر تحميل بيانات الصفحة", 500);
  }
});

export default router;
