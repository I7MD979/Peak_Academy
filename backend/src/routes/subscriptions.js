import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { success, error } from "../utils/response.js";
import {
  listActivePlans,
  createSubscriptionPurchaseCheckout
} from "../services/subscriptionService.js";
import { getActiveSubscription } from "../services/enrollmentService.js";
import { countPaidSessionEnrollments } from "../services/subscriptionService.js";
import { ensureReferralCode } from "../services/referralService.js";
import { CACHE, withCache } from "../lib/cache.js";

const router = Router();

router.get("/plans", auth, async (_req, res) => {
  try {
    const plans = await withCache(CACHE.subscriptionPlans(), 3600, listActivePlans);
    return success(res, plans);
  } catch (err) {
    return error(res, err.message || "فشل تحميل الخطط", 500);
  }
});

router.get("/me", auth, checkRole("student"), async (req, res) => {
  try {
    const data = await withCache(CACHE.studentSubscription(req.user.id), 60, async () => {
      await ensureReferralCode(req.user);
      const subscription = await getActiveSubscription(req.user.id);
      const paidSessions = await countPaidSessionEnrollments(req.user.id);
      return {
        subscription,
        paid_session_count: paidSessions,
        show_subscription_cta: paidSessions >= 3 && !subscription,
        sessions_remaining: subscription?.sessions_remaining ?? 0
      };
    });
    return success(res, data);
  } catch (err) {
    return error(res, err.message || "فشل تحميل الاشتراك", 500);
  }
});

router.post("/purchase", auth, checkRole("student"), async (req, res) => {
  try {
    const { plan_id, promo_code } = req.body;
    if (!plan_id) return error(res, "معرّف الخطة مطلوب", 400);

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const result = await createSubscriptionPurchaseCheckout(
      req.user,
      plan_id,
      promo_code,
      frontendUrl
    );

    return success(res, {
      checkout_url: result.checkout_url,
      transaction_id: result.transaction_id,
      plan: result.plan
    });
  } catch (err) {
    return error(res, err.message || "فشل بدء شراء الاشتراك", 500);
  }
});

export default router;
