import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";
import { ensureUserProfile } from "../utils/ensure-user-profile.js";
import { getTeacherBalance, getTeacherProfile } from "../services/teacher.service.js";

const router = Router();
const MIN_WITHDRAWAL = 50;

async function resolveTeacherForEarnings(req, res) {
  let teacher = await getTeacherProfile(req.user.id);
  if (!teacher) {
    await ensureUserProfile(supabase, {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      role: "teacher",
      phone: req.user.phone
    });
    teacher = await getTeacherProfile(req.user.id);
  }
  if (!teacher) {
    error(res, "ملف المدرس غير موجود", 404);
    return null;
  }
  return teacher;
}

router.get("/summary", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await resolveTeacherForEarnings(req, res);
    if (!teacher) return;

    const balance = await getTeacherBalance(teacher.id);
    return success(res, balance);
  } catch (_err) {
    return error(res, "تعذر تحميل ملخص الأرباح", 500);
  }
});

router.get("/withdrawals", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await resolveTeacherForEarnings(req, res);
    if (!teacher) return;

    const { page = 1, limit = 10, status = "all" } = req.query;
    const { from, to } = paginate(page, limit);

    let query = supabase
      .from("withdrawal_requests")
      .select("*", { count: "exact" })
      .eq("teacher_id", teacher.id)
      .order("requested_at", { ascending: false })
      .range(from, to);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, count, error: dbError } = await query;
    if (dbError) throw dbError;

    return paginated(res, data, paginationMeta(count, Number(page), Number(limit)));
  } catch (_err) {
    return error(res, "تعذر تحميل طلبات السحب", 500);
  }
});

router.get("/", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await resolveTeacherForEarnings(req, res);
    if (!teacher) return;

    const { page = 1, limit = 10, status = "all" } = req.query;
    const { from, to } = paginate(page, limit);

    let query = supabase
      .from("teacher_earnings")
      .select("*,session:sessions(title,scheduled_at)", { count: "exact" })
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, count, error: dbError } = await query;
    if (dbError) throw dbError;

    return paginated(res, data, paginationMeta(count, Number(page), Number(limit)));
  } catch (_err) {
    return error(res, "تعذر تحميل سجل الأرباح", 500);
  }
});

router.post("/withdraw", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await resolveTeacherForEarnings(req, res);
    if (!teacher) return;

    const amount = Number(req.body.amount);
    const method = String(req.body.method || "").trim();
    const accountNumber = String(req.body.account_number || "").trim();
    const notes = String(req.body.notes || "").trim() || null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return error(res, "أدخل مبلغ سحب صحيحًا", 400);
    }

    if (amount < MIN_WITHDRAWAL) {
      return error(res, `الحد الأدنى للسحب ${MIN_WITHDRAWAL} جنيه`, 400);
    }

    if (!method) {
      return error(res, "اختر طريقة السحب", 400);
    }

    if (!accountNumber || accountNumber.length < 6) {
      return error(res, "أدخل رقم حساب أو محفظة صحيحًا", 400);
    }

    const balance = await getTeacherBalance(teacher.id);

    if (amount > balance.available_balance) {
      return error(res, "المبلغ أكبر من الرصيد المتاح للسحب", 400);
    }

    const { data: withdrawal, error: dbError } = await supabase
      .from("withdrawal_requests")
      .insert({
        id: `wd-${Date.now()}`,
        teacher_id: teacher.id,
        amount,
        method,
        account_number: accountNumber,
        notes,
        status: "pending"
      })
      .select()
      .single();

    if (dbError) throw dbError;
    return success(res, withdrawal, "تم إرسال طلب السحب بنجاح", 201);
  } catch (_err) {
    return error(res, "تعذر إرسال طلب السحب", 500);
  }
});

export default router;
