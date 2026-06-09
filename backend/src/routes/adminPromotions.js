import { Router } from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";

const router = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_STATUSES = new Set(["all", "active", "inactive", "expired"]);
const VALID_TYPES = new Set(["coupon", "bundle", "early_bird", "referral"]);

function sanitizeSearchTerm(value) {
  return String(value || "")
    .trim()
    .replace(/[%_,]/g, "")
    .slice(0, 100);
}

function formatZodError(issue) {
  const messages = {
    code: "كود العرض غير صالح",
    type: "نوع العرض غير مدعوم",
    discount_type: "نوع الخصم غير مدعوم",
    discount_value: "قيمة الخصم غير صالحة",
    applies_to: "نطاق التطبيق غير مدعوم",
    expires_at: "تاريخ الانتهاء غير صالح"
  };
  return issue?.message || messages[issue?.path?.[0]] || "بيانات غير صالحة";
}

const promoBaseSchema = z.object({
  code: z
    .string({ required_error: "كود العرض مطلوب" })
    .min(2, "كود العرض قصير جداً (حرفان على الأقل)")
    .max(40, "كود العرض طويل جداً"),
  type: z.enum(["coupon", "bundle", "early_bird", "referral"], {
    errorMap: () => ({ message: "نوع العرض غير مدعوم" })
  }),
  discount_type: z.enum(["percent", "fixed", "free_session"], {
    errorMap: () => ({ message: "نوع الخصم غير مدعوم" })
  }),
  discount_value: z.coerce.number().min(0, "قيمة الخصم يجب أن تكون موجبة"),
  min_sessions: z.coerce.number().int().min(1).optional(),
  bonus_sessions: z.coerce.number().int().min(0).optional(),
  max_uses: z.coerce.number().int().min(1).nullable().optional(),
  per_user_limit: z.coerce.number().int().min(1).optional(),
  applies_to: z.enum(["all", "per_session", "subscription"]).optional(),
  expires_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional()
});

const promoSchema = promoBaseSchema.superRefine((data, ctx) => {
    if (data.discount_type === "percent" && data.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "النسبة المئوية لا يمكن أن تتجاوز 100",
        path: ["discount_value"]
      });
    }
    if (data.expires_at && new Date(data.expires_at) <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "تاريخ الانتهاء يجب أن يكون في المستقبل",
        path: ["expires_at"]
      });
    }
  });

const promoUpdateSchema = promoBaseSchema.partial().superRefine((data, ctx) => {
  if (data.discount_type === "percent" && data.discount_value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "النسبة المئوية لا يمكن أن تتجاوز 100",
      path: ["discount_value"]
    });
  }
});

router.get("/promotions/stats", auth, requirePermission("promotions.read"), async (_req, res) => {
  try {
    const nowIso = new Date().toISOString();

    const [total, active, inactive, expired, usesRes, discountRows] = await Promise.all([
      supabase.from("promotions").select("id", { count: "exact", head: true }),
      supabase.from("promotions").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("promotions").select("id", { count: "exact", head: true }).eq("is_active", false),
      supabase
        .from("promotions")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .not("expires_at", "is", null)
        .lt("expires_at", nowIso),
      supabase.from("promotion_uses").select("id", { count: "exact", head: true }),
      supabase.from("promotion_uses").select("discount_applied")
    ]);

    for (const result of [total, active, inactive, expired, usesRes]) {
      if (result.error) throw result.error;
    }
    if (discountRows.error) throw discountRows.error;

    const totalDiscount = (discountRows.data || []).reduce(
      (sum, row) => sum + Number(row.discount_applied || 0),
      0
    );

    return success(res, {
      total: total.count || 0,
      active: active.count || 0,
      inactive: inactive.count || 0,
      expired: expired.count || 0,
      active_promotions: active.count || 0,
      total_uses: usesRes.count || 0,
      total_discount_given: totalDiscount
    });
  } catch (_err) {
    return error(res, "تعذر تحميل إحصائيات العروض", 500);
  }
});

router.get("/promotions", auth, requirePermission("promotions.read"), async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const status = VALID_STATUSES.has(String(req.query.status || "all"))
      ? String(req.query.status)
      : "all";
    const type = VALID_TYPES.has(String(req.query.type || "")) ? String(req.query.type) : "";
    const search = sanitizeSearchTerm(req.query.search);
    const nowIso = new Date().toISOString();

    const { from, to } = paginate(page, limit);
    let query = supabase
      .from("promotions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (req.query.active === "true") query = query.eq("is_active", true);
    if (req.query.active === "false") query = query.eq("is_active", false);

    if (status === "active") query = query.eq("is_active", true);
    if (status === "inactive") query = query.eq("is_active", false);
    if (status === "expired") {
      query = query.not("expires_at", "is", null).lt("expires_at", nowIso);
    }

    if (type) query = query.eq("type", type);
    if (search) query = query.ilike("code", `%${search}%`);

    const { data, count, error: dbError } = await query;
    if (dbError) throw dbError;

    return paginated(res, data || [], paginationMeta(count, page, limit));
  } catch (_err) {
    return error(res, "تعذر تحميل العروض", 500);
  }
});

router.post("/promotions", auth, requirePermission("promotions.create"), async (req, res) => {
  try {
    const parsed = promoSchema.safeParse(req.body);
    if (!parsed.success) {
      return error(res, formatZodError(parsed.error.issues[0]), 400);
    }

    const payload = {
      ...parsed.data,
      code: parsed.data.code.toUpperCase().trim(),
      min_sessions: parsed.data.min_sessions ?? 1,
      bonus_sessions: parsed.data.bonus_sessions ?? 0,
      per_user_limit: parsed.data.per_user_limit ?? 1,
      applies_to: parsed.data.applies_to ?? "per_session",
      created_by: req.user.id,
      is_active: true
    };

    const { data, error: dbError } = await supabase
      .from("promotions")
      .insert(payload)
      .select("*")
      .single();

    if (dbError) {
      if (dbError.code === "23505") {
        return error(res, "كود العرض مستخدم بالفعل", 409);
      }
      throw dbError;
    }

    return success(res, data, "تم إنشاء العرض", 201);
  } catch (_err) {
    return error(res, "تعذر إنشاء العرض", 500);
  }
});

router.get("/promotions/:id/uses", auth, requirePermission("promotions.read"), async (req, res) => {
  try {
    const promoId = req.params.id;
    if (!UUID_RE.test(promoId)) {
      return error(res, "معرّف العرض غير صالح", 400);
    }

    const { data: promo, error: promoError } = await supabase
      .from("promotions")
      .select("id")
      .eq("id", promoId)
      .maybeSingle();

    if (promoError) throw promoError;
    if (!promo) return error(res, "العرض غير موجود", 404);

    const { data, error: dbError } = await supabase
      .from("promotion_uses")
      .select("*, user:users(full_name, email)")
      .eq("promotion_id", promoId)
      .order("used_at", { ascending: false })
      .limit(50);

    if (dbError) throw dbError;
    return success(res, data || []);
  } catch (_err) {
    return error(res, "تعذر تحميل سجل الاستخدام", 500);
  }
});

router.put("/promotions/:id", auth, requirePermission("promotions.edit"), async (req, res) => {
  try {
    const promoId = req.params.id;
    if (!UUID_RE.test(promoId)) {
      return error(res, "معرّف العرض غير صالح", 400);
    }

    const parsed = promoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return error(res, formatZodError(parsed.error.issues[0]), 400);
    }

    if (!Object.keys(parsed.data).length) {
      return error(res, "لا توجد بيانات للتحديث", 400);
    }

    const updates = { ...parsed.data };
    if (updates.code) updates.code = updates.code.toUpperCase().trim();

    const { data, error: dbError } = await supabase
      .from("promotions")
      .update(updates)
      .eq("id", promoId)
      .select("*")
      .maybeSingle();

    if (dbError) {
      if (dbError.code === "23505") {
        return error(res, "كود العرض مستخدم بالفعل", 409);
      }
      throw dbError;
    }
    if (!data) return error(res, "العرض غير موجود", 404);

    return success(res, data, "تم تحديث العرض");
  } catch (_err) {
    return error(res, "تعذر تحديث العرض", 500);
  }
});

router.delete("/promotions/:id", auth, requirePermission("promotions.delete"), async (req, res) => {
  try {
    const promoId = req.params.id;
    if (!UUID_RE.test(promoId)) {
      return error(res, "معرّف العرض غير صالح", 400);
    }

    const { data, error: dbError } = await supabase
      .from("promotions")
      .update({ is_active: false })
      .eq("id", promoId)
      .select("*")
      .maybeSingle();

    if (dbError) throw dbError;
    if (!data) return error(res, "العرض غير موجود", 404);

    return success(res, data, "تم إيقاف العرض");
  } catch (_err) {
    return error(res, "تعذر إيقاف العرض", 500);
  }
});

router.post("/early-bird/activate", auth, requirePermission("promotions.create"), async (req, res) => {
  try {
    const discountPercent = Number(req.body?.discount_percent ?? 15);
    const hours = Number(req.body?.hours ?? 48);

    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      return error(res, "نسبة الخصم يجب أن تكون بين 1 و 100", 400);
    }
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
      return error(res, "مدة العرض يجب أن تكون بين 1 و 168 ساعة", 400);
    }

    const promoCode = (req.body?.code || `EARLY${Date.now().toString(36).toUpperCase()}`)
      .toUpperCase()
      .trim()
      .slice(0, 40);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    await supabase.from("promotions").update({ is_active: false }).eq("type", "early_bird");

    const { data, error: dbError } = await supabase
      .from("promotions")
      .insert({
        code: promoCode,
        type: "early_bird",
        discount_type: "percent",
        discount_value: discountPercent,
        applies_to: "per_session",
        expires_at: expiresAt,
        is_active: true,
        created_by: req.user.id
      })
      .select("*")
      .single();

    if (dbError) throw dbError;
    return success(res, data, "تم تفعيل عرض الطائر المبكر", 201);
  } catch (_err) {
    return error(res, "تعذر تفعيل عرض الطائر المبكر", 500);
  }
});

export default router;
