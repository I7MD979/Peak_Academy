import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { success, error } from "../utils/response.js";
import { validatePromoCode, calculateDiscount } from "../utils/promoValidator.js";
import { getSessionForEnroll } from "../services/enrollmentService.js";
import { sessionPrice } from "../lib/schema.js";

const router = Router();

/** Master prompt: POST /promotions/validate */
router.post("/validate", auth, async (req, res) => {
  try {
    const { code, payment_type = "per_session", session_id, plan_id } = req.body;
    if (!code) return error(res, "أدخل كود الخصم", 400);

    const pType = payment_type === "per_session" ? "pay_per_session" : payment_type;
    let originalPrice = 0;

    if (pType === "subscription" && plan_id) {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("price")
        .eq("id", plan_id)
        .maybeSingle();
      originalPrice = Number(plan?.price || 0);
    } else if (session_id) {
      const session = await getSessionForEnroll(session_id);
      originalPrice = sessionPrice(session);
    }

    const validation = await validatePromoCode(code, req.user.id, pType);
    if (!validation.valid) {
      return success(res, {
        discount: 0,
        message: validation.reason,
        valid: false
      });
    }

    const discountAmount = calculateDiscount(originalPrice, validation);
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return success(res, {
      valid: true,
      discount: discountAmount,
      message:
        discountAmount > 0
          ? `خصم ${discountAmount} جنيه — السعر بعد الخصم ${finalPrice} جنيه`
          : "تم تفعيل الكود",
      promotion_id: validation.id,
      original_price: originalPrice,
      final_price: finalPrice
    });
  } catch (err) {
    return error(res, err.message || "فشل التحقق من الكود", 500);
  }
});

export default router;
