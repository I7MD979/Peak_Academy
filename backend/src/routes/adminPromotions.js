import { Router } from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";

const router = Router();

const promoSchema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(["coupon", "bundle", "early_bird", "referral"]),
  discount_type: z.enum(["percent", "fixed", "free_session"]),
  discount_value: z.coerce.number().min(0),
  min_sessions: z.coerce.number().int().min(1).optional(),
  bonus_sessions: z.coerce.number().int().min(0).optional(),
  max_uses: z.coerce.number().int().min(1).nullable().optional(),
  per_user_limit: z.coerce.number().int().min(1).optional(),
  applies_to: z.enum(["all", "per_session", "subscription"]).optional(),
  expires_at: z.string().datetime().nullable().optional()
});

router.use(auth, checkRole("admin"));

router.post("/promotions", async (req, res) => {
  try {
    const parsed = promoSchema.safeParse(req.body);
    if (!parsed.success) return error(res, parsed.error.issues[0]?.message || "بيانات غير صالحة", 400);

    const payload = {
      ...parsed.data,
      code: parsed.data.code.toUpperCase(),
      created_by: req.user.id,
      is_active: true
    };

    const { data, error: dbError } = await supabase.from("promotions").insert(payload).select("*").single();
    if (dbError) throw dbError;
    return success(res, data, "تم إنشاء العرض", 201);
  } catch (err) {
    return error(res, err.message || "فشل إنشاء العرض", 500);
  }
});

router.get("/promotions", async (req, res) => {
  try {
    const { page = 1, limit = 20, active } = req.query;
    const { from, to } = paginate(page, limit);
    let query = supabase.from("promotions").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (active === "true") query = query.eq("is_active", true);
    if (active === "false") query = query.eq("is_active", false);
    const { data, count, error: dbError } = await query;
    if (dbError) throw dbError;
    return paginated(res, data || [], paginationMeta(count, Number(page), Number(limit)));
  } catch (err) {
    return error(res, err.message || "فشل تحميل العروض", 500);
  }
});

router.get("/promotions/stats", async (req, res) => {
  try {
    const { data: uses } = await supabase.from("promotion_uses").select("discount_applied");
    const totalDiscount = (uses || []).reduce((s, u) => s + Number(u.discount_applied || 0), 0);
    const { count: promoCount } = await supabase
      .from("promotions")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    const { count: useCount } = await supabase
      .from("promotion_uses")
      .select("*", { count: "exact", head: true });

    return success(res, {
      active_promotions: promoCount || 0,
      total_uses: useCount || 0,
      total_discount_given: totalDiscount
    });
  } catch (err) {
    return error(res, err.message || "فشل الإحصائيات", 500);
  }
});

router.get("/promotions/:id/uses", async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("promotion_uses")
      .select("*, user:users(full_name, email)")
      .eq("promotion_id", req.params.id)
      .order("used_at", { ascending: false });
    if (dbError) throw dbError;
    return success(res, data || []);
  } catch (err) {
    return error(res, err.message || "فشل تحميل الاستخدامات", 500);
  }
});

router.put("/promotions/:id", async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.code) updates.code = String(updates.code).toUpperCase();
    delete updates.id;
    delete updates.created_at;
    delete updates.used_count;

    const { data, error: dbError } = await supabase
      .from("promotions")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();
    if (dbError) throw dbError;
    if (!data) return error(res, "العرض غير موجود", 404);
    return success(res, data);
  } catch (err) {
    return error(res, err.message || "فشل التحديث", 500);
  }
});

router.delete("/promotions/:id", async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("promotions")
      .update({ is_active: false })
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();
    if (dbError) throw dbError;
    if (!data) return error(res, "العرض غير موجود", 404);
    return success(res, data, "تم إلغاء تفعيل العرض");
  } catch (err) {
    return error(res, err.message || "فشل الحذف", 500);
  }
});

router.post("/early-bird/activate", async (req, res) => {
  try {
    const { discount_percent = 15, hours = 48, code } = req.body;
    const promoCode = (code || `EARLY${Date.now().toString(36).toUpperCase()}`).toUpperCase();
    const expiresAt = new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString();

    await supabase.from("promotions").update({ is_active: false }).eq("type", "early_bird");

    const { data, error: dbError } = await supabase
      .from("promotions")
      .insert({
        code: promoCode,
        type: "early_bird",
        discount_type: "percent",
        discount_value: discount_percent,
        applies_to: "per_session",
        expires_at: expiresAt,
        is_active: true,
        created_by: req.user.id
      })
      .select("*")
      .single();

    if (dbError) throw dbError;
    return success(res, data, "تم تفعيل عرض الطائر المبكر", 201);
  } catch (err) {
    return error(res, err.message || "فشل تفعيل العرض", 500);
  }
});

export default router;
