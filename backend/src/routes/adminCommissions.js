import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { success, error } from "../utils/response.js";
import { calculateMonthlyCommissions } from "../services/roomAttribution.service.js";
import {
  getPayoutList,
  markPayoutPaid,
  calculateMonthlyPayouts,
  openPayoutWindow,
} from "../jobs/monthlyPayout.job.js";
import { getCurrentPayoutMonth } from "../services/platformConfig.service.js";

const router = Router();

// GET /api/admin/commissions — قائمة العمولات المعلقة
router.get("/commissions", auth, checkRole("admin"), async (req, res) => {
  try {
    const status = ["pending", "approved", "paid"].includes(req.query.status)
      ? req.query.status
      : "pending";

    let query = supabase
      .from("room_commission_earnings")
      .select(`
        *,
        teacher:users(id, full_name, email)
      `)
      .order("period_month", { ascending: false });

    if (status !== "all") query = query.eq("status", status);

    const { data, error: dbErr } = await query;
    if (dbErr) throw dbErr;

    return success(res, { commissions: data || [] });
  } catch (_err) {
    return error(res, "تعذر تحميل العمولات", 500);
  }
});

// PATCH /api/admin/commissions/:id/pay — تسجيل الدفع
router.patch("/commissions/:id/pay", auth, checkRole("admin"), async (req, res) => {
  const { id } = req.params;
  if (!id) return error(res, "معرّف العمولة مطلوب", 400);

  try {
    const { data, error: dbErr } = await supabase
      .from("room_commission_earnings")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (dbErr) throw dbErr;
    if (!data) return error(res, "العمولة غير موجودة أو مدفوعة بالفعل", 404);

    return success(res, data, "تم تسجيل الدفع");
  } catch (_err) {
    return error(res, "تعذر تحديث الحالة", 500);
  }
});

// POST /api/admin/commissions/calculate — تشغيل حساب العمولات يدوياً
router.post("/commissions/calculate", auth, checkRole("admin"), async (req, res) => {
  const month = String(req.body.month || "").trim();
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return error(res, "أدخل الشهر بصيغة YYYY-MM", 400);
  }

  try {
    const result = await calculateMonthlyCommissions(month);
    return success(res, result, `تم حساب عمولات ${month}`);
  } catch (_err) {
    return error(res, "تعذر حساب العمولات", 500);
  }
});

// ── Monthly Payout Routes ─────────────────────────────────────────────────────

// GET /api/admin/payouts?month=2026-06
router.get("/payouts", auth, checkRole("admin"), async (req, res) => {
  const month = String(req.query.month || getCurrentPayoutMonth());
  try {
    const list = await getPayoutList(month);

    const totalToPay   = list.reduce((s, r) => s + Number(r.total_amount), 0);
    const sessionTotal = list.reduce((s, r) => s + Number(r.session_teacher_cut || 0), 0);
    const roomTotal    = list.reduce((s, r) => s + Number(r.room_commission || 0), 0);

    return success(res, {
      month,
      summary: {
        teacher_count: list.length,
        total_to_pay:  Math.round(totalToPay * 100) / 100,
        session_total: Math.round(sessionTotal * 100) / 100,
        room_total:    Math.round(roomTotal * 100) / 100,
      },
      payouts: list,
    });
  } catch (err) {
    return error(res, err.message || "تعذر تحميل قائمة المدفوعات", 500);
  }
});

// POST /api/admin/payouts/calculate
router.post("/payouts/calculate", auth, checkRole("admin"), async (req, res) => {
  const month = String(req.body.month || getCurrentPayoutMonth());
  try {
    const result = await calculateMonthlyPayouts(month);
    return success(res, result, `تم حساب ${result.processed} مدرس`);
  } catch (err) {
    return error(res, err.message || "تعذر الحساب", 500);
  }
});

// POST /api/admin/payouts/open-window
router.post("/payouts/open-window", auth, checkRole("admin"), async (req, res) => {
  const month = String(req.body.month || getCurrentPayoutMonth());
  try {
    const result = await openPayoutWindow(month);
    return success(res, result, `تم فتح النافذة لـ ${result.opened} مدرس`);
  } catch (err) {
    return error(res, err.message || "تعذر فتح النافذة", 500);
  }
});

// POST /api/admin/payouts/:teacherId/pay
router.post("/payouts/:teacherId/pay", auth, checkRole("admin"), async (req, res) => {
  const month = String(req.body.month || getCurrentPayoutMonth());
  try {
    await markPayoutPaid(req.params.teacherId, month);
    return success(res, {}, "تم تسجيل الدفع بنجاح");
  } catch (err) {
    return error(res, err.message || "تعذر تسجيل الدفع", 500);
  }
});

export default router;
