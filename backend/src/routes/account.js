/**
 * /api/account — Self-service account management for the authenticated user.
 *
 * All routes require a valid JWT. Users only ever touch their own data.
 */
import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { success, error } from "../utils/response.js";
import { UserService } from "../services/user.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { supabase } from "../lib/supabase.js";

const router = Router();

// ── GET /api/account/me ───────────────────────────────────────────────────────
// Full profile including role-specific data (student grade, teacher subjects, etc.)
router.get("/me", auth, async (req, res) => {
  try {
    const result = await UserRepository.findWithProfile(req.user.id);
    if (!result) return error(res, "الحساب غير موجود", 404);
    return success(res, result);
  } catch (_err) {
    return error(res, "تعذر تحميل بيانات الحساب", 500);
  }
});

// ── PATCH /api/account/profile ────────────────────────────────────────────────
// Update name and/or phone for the currently signed-in user.
router.patch("/profile", auth, async (req, res) => {
  try {
    const result = await UserService.updateOwnProfile(req.user.id, req.body || {});
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, result.data, "تم تحديث الملف الشخصي");
  } catch (_err) {
    return error(res, "تعذر تحديث الملف الشخصي", 500);
  }
});

// ── GET /api/account/subscriptions ───────────────────────────────────────────
// Students only: view own subscription history.
router.get("/subscriptions", auth, async (req, res) => {
  try {
    if (req.user.role !== "student") return error(res, "الاشتراكات متاحة للطلاب فقط", 403);
    const subs = await UserRepository.findUserSubscriptions(req.user.id);
    return success(res, subs);
  } catch (_err) {
    return error(res, "تعذر تحميل الاشتراكات", 500);
  }
});

// ── GET /api/account/activity ─────────────────────────────────────────────────
// Basic account activity: last sign-in, total sessions attended, subscription status.
router.get("/activity", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [enrollmentsRes, subRes] = await Promise.all([
      supabase
        .from("enrollments")
        .select("id, status, enrolled_at", { count: "exact" })
        .eq("student_id", userId)
        .limit(1),
      req.user.role === "student"
        ? supabase
            .from("student_subscriptions")
            .select("status, sessions_remaining, current_period_end")
            .eq("student_id", userId)
            .eq("status", "active")
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    const totalEnrollments = enrollmentsRes.count || 0;
    const activeSubscription = subRes.data || null;

    return success(res, { total_enrollments: totalEnrollments, active_subscription: activeSubscription });
  } catch (_err) {
    return error(res, "تعذر تحميل النشاط", 500);
  }
});

// ── DELETE /api/account ───────────────────────────────────────────────────────
// Soft-delete own account (deactivates it; data is preserved for audit purposes).
router.delete("/", auth, async (req, res) => {
  try {
    const { confirm } = req.body || {};
    if (confirm !== true && confirm !== "true") {
      return error(res, "يرجى تأكيد الحذف بإرسال { confirm: true }", 400);
    }

    await UserService.deleteOwnAccount(req.user.id);
    return success(res, null, "تم إلغاء تفعيل الحساب. سيتم تسجيل خروجك تلقائياً.");
  } catch (_err) {
    return error(res, "تعذر حذف الحساب", 500);
  }
});

export default router;
