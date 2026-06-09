import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { idempotency } from "../middleware/idempotency.js";
import { success, error } from "../utils/response.js";
import {
  listActivePlans,
  createSubscriptionPurchaseCheckout
} from "../services/subscriptionService.js";
import { freezeSubscription, unfreezeSubscription } from "../services/subscriptionFreeze.service.js";
import { getActiveSubscription } from "../services/enrollmentService.js";
import { countPaidSessionEnrollments } from "../services/subscriptionService.js";
import { ensureReferralCode } from "../services/referralService.js";
import { activateTrial, hasRoomAccess } from "../services/trialService.js";
import { CACHE, withCache, invalidateSubscriptionCaches } from "../lib/cache.js";
import { allowSchema } from "../middleware/allowlist.js";
import { paymentLimiter } from "../middleware/resourceLimits.js";
import { preventDuplicateSubscription, paymentVelocity } from "../middleware/businessRules.js";

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

router.post(
  "/purchase",
  auth,
  checkRole("student"),
  paymentLimiter,
  preventDuplicateSubscription,
  paymentVelocity,
  idempotency({ required: true }),
  allowSchema("subscriptionPurchase"),
  async (req, res) => {
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

// ── Free trial ────────────────────────────────────────────────────────────────

router.post("/activate-trial", auth, checkRole("student"), async (req, res) => {
  try {
    const result = await activateTrial(req.user.id);
    return success(res, result, result.message);
  } catch (err) {
    return error(res, err.message || "فشل تفعيل التجربة المجانية", err.status || 500);
  }
});

// GET /api/subscriptions/me/access — quick access check for study rooms
router.get("/me/access", auth, async (req, res) => {
  try {
    // Teachers always have access (has_room_access handles this)
    const access = await hasRoomAccess(req.user.id);
    return success(res, { has_access: access });
  } catch (err) {
    return error(res, err.message || "فشل التحقق من الصلاحية", 500);
  }
});

// ── Freeze / Unfreeze ─────────────────────────────────────────────────────────

router.post("/freeze", auth, checkRole("student"), async (req, res) => {
  try {
    const { days, reason } = req.body;
    if (!days) return error(res, "عدد الأيام مطلوب", 400);

    const result = await freezeSubscription(req.user.id, { days: Number(days), reason });
    return success(res, result);
  } catch (err) {
    return error(res, err.message || "فشل تجميد الاشتراك", err.status || 500);
  }
});

router.post("/unfreeze", auth, checkRole("student"), async (req, res) => {
  try {
    const result = await unfreezeSubscription(req.user.id);
    return success(res, result);
  } catch (err) {
    return error(res, err.message || "فشل إلغاء التجميد", err.status || 500);
  }
});

export default router;
