import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { success, error } from "../utils/response.js";
import { calculateMonthlyCommissions } from "../services/roomAttribution.service.js";

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

export default router;
