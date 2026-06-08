/**
 * Business Flow Protection
 * OWASP API6:2023 — Unrestricted Access to Sensitive Business Flows
 */

import { redis } from "../lib/cache.js";
import { supabase } from "../lib/supabase.js";

const VELOCITY_TIMEOUT_MS = 2000;

function withTimeout(promise, ms = VELOCITY_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("velocity_timeout")), ms))
  ]);
}

export function velocityCheck(action, maxCount, windowSeconds, errorMessage) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next();

    const key = `velocity:${action}:${userId}`;

    try {
      const count = await withTimeout(redis.incr(key));
      if (count === 1) {
        await withTimeout(redis.expire(key, windowSeconds));
      }

      if (count > maxCount) {
        return res.status(429).json({
          success: false,
          error: errorMessage || "محاولات كثيرة جداً، حاول لاحقاً",
          code: "VELOCITY_EXCEEDED",
          retryAfter: windowSeconds
        });
      }
    } catch {
      /* Redis down — fail open */
    }

    next();
  };
}

export async function validateSessionCapacity(sessionId, res) {
  const { data: session } = await supabase
    .from("sessions")
    .select("max_students, current_students, enrolled_count, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    res.status(404).json({ success: false, error: "الجلسة غير موجودة" });
    return false;
  }

  if (session.status !== "scheduled") {
    res.status(400).json({ success: false, error: "الجلسة غير متاحة للتسجيل" });
    return false;
  }

  const enrolled = session.enrolled_count ?? session.current_students ?? 0;
  if (session.max_students > 0 && enrolled >= session.max_students) {
    res.status(409).json({ success: false, error: "اكتملت مقاعد الجلسة", code: "SESSION_FULL" });
    return false;
  }

  return true;
}

export const preventDuplicateSubscription = async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from("student_subscriptions")
      .select("id, status")
      .eq("student_id", req.user.id)
      .in("status", ["active", "grace", "frozen"])
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "لديك اشتراك نشط بالفعل. يرجى إلغاء الاشتراك الحالي أولاً",
        code: "DUPLICATE_SUBSCRIPTION",
        existingSubscriptionId: existing.id
      });
    }
    next();
  } catch (err) {
    console.error("[businessRules] duplicate sub check:", err.message);
    next();
  }
};

export function detectSuspiciousActivity(req, _res, next) {
  setImmediate(async () => {
    try {
      const userId = req.user?.id;
      if (!userId) return;

      const key = `activity:${userId}:${new Date().toISOString().slice(0, 13)}`;
      const count = await redis.incr(key).catch(() => null);
      if (count === 1) await redis.expire(key, 3600).catch(() => {});

      if (count > 100) {
        console.warn(`[security] High activity: user=${userId} ops=${count} in last hour`);
      }
    } catch {
      /* silent */
    }
  });
  next();
}

export const accountActionVelocity = velocityCheck(
  "account-action",
  5,
  15 * 60,
  "محاولات كثيرة على حسابك، انتظر 15 دقيقة"
);

export const enrollmentVelocity = velocityCheck(
  "enrollment",
  10,
  60 * 60,
  "تجاوزت الحد المسموح لعدد التسجيلات في الساعة"
);

export const paymentVelocity = velocityCheck(
  "payment",
  5,
  60 * 60,
  "تجاوزت الحد المسموح لمحاولات الدفع في الساعة"
);
