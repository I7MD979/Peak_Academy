import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";
import { ensureUserProfile } from "../utils/ensure-user-profile.js";
import { getTeacherBalance, getTeacherProfile } from "../services/teacher.service.js";
import { getTeacherRoomEarningsSummary } from "../services/roomAttribution.service.js";

const router = Router();
const MIN_WITHDRAWAL = 50;
const MAX_WITHDRAWAL = 500000;
const MAX_ACCOUNT_LENGTH = 40;

const VALID_EARNING_STATUSES = new Set(["all", "pending", "paid"]);
const VALID_WITHDRAWAL_STATUSES = new Set(["all", "pending", "approved", "paid", "rejected"]);
const VALID_WITHDRAWAL_METHODS = new Set(["instapay", "vodafone_cash", "bank_transfer", "bank"]);

function parseDateStartIso(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function parseDateEndIso(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function sanitizeAccountNumber(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, MAX_ACCOUNT_LENGTH);
}

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

    const { page = 1, limit = 10, status = "all", from, to } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const pageNum = Math.max(Number(page) || 1, 1);
    const { from: rangeFrom, to: rangeTo } = paginate(pageNum, safeLimit);
    const safeStatus = VALID_WITHDRAWAL_STATUSES.has(String(status)) ? String(status) : "all";

    let query = supabase
      .from("withdrawal_requests")
      .select("*", { count: "exact" })
      .eq("teacher_id", teacher.id)
      .order("requested_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (safeStatus !== "all") {
      query = query.eq("status", safeStatus);
    }

    const fromIso = parseDateStartIso(from);
    const toIso = parseDateEndIso(to);
    if (fromIso) query = query.gte("requested_at", fromIso);
    if (toIso) query = query.lte("requested_at", toIso);

    const { data, count, error: dbError } = await query;
    if (dbError) throw dbError;

    return paginated(res, data, paginationMeta(count, pageNum, safeLimit));
  } catch (_err) {
    return error(res, "تعذر تحميل طلبات السحب", 500);
  }
});

router.get("/", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await resolveTeacherForEarnings(req, res);
    if (!teacher) return;

    const { page = 1, limit = 10, status = "all", from, to } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const pageNum = Math.max(Number(page) || 1, 1);
    const { from: rangeFrom, to: rangeTo } = paginate(pageNum, safeLimit);
    const safeStatus = VALID_EARNING_STATUSES.has(String(status)) ? String(status) : "all";

    let query = supabase
      .from("teacher_earnings")
      .select("*,session:sessions(title,scheduled_at)", { count: "exact" })
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (safeStatus !== "all") {
      query = query.eq("status", safeStatus);
    }

    const fromIso = parseDateStartIso(from);
    const toIso = parseDateEndIso(to);
    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lte("created_at", toIso);

    const { data, count, error: dbError } = await query;
    if (dbError) throw dbError;

    return paginated(res, data, paginationMeta(count, pageNum, safeLimit));
  } catch (_err) {
    return error(res, "تعذر تحميل سجل الأرباح", 500);
  }
});

router.post("/withdraw", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await resolveTeacherForEarnings(req, res);
    if (!teacher) return;

    const amount = Number(req.body.amount);
    const methodRaw = String(req.body.method || "").trim();
    const method = methodRaw === "bank" ? "bank_transfer" : methodRaw;
    const accountNumber = sanitizeAccountNumber(req.body.account_number);
    const notesRaw = String(req.body.notes || "").trim();
    const notes = notesRaw ? notesRaw.slice(0, 500) : null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return error(res, "أدخل مبلغ سحب صحيحًا", 400);
    }

    if (amount < MIN_WITHDRAWAL) {
      return error(res, `الحد الأدنى للسحب ${MIN_WITHDRAWAL} جنيه`, 400);
    }

    if (amount > MAX_WITHDRAWAL) {
      return error(res, "مبلغ السحب كبير جداً", 400);
    }

    if (!method || !VALID_WITHDRAWAL_METHODS.has(method)) {
      return error(res, "طريقة السحب غير صالحة", 400);
    }

    if (!accountNumber || accountNumber.length < 6) {
      return error(res, "أدخل رقم حساب أو محفظة صحيحًا (6 أحرف على الأقل)", 400);
    }

    if (!/^[0-9+-]+$/.test(accountNumber)) {
      return error(res, "رقم الحساب يجب أن يحتوي على أرقام فقط", 400);
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
        amount: Math.round(amount * 100) / 100,
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

// ── Room Commission Routes ────────────────────────────────────────────────────

// GET /peak-api/earnings/rooms — عمولات الغرف الشهرية
router.get("/rooms", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await resolveTeacherForEarnings(req, res);
    if (!teacher) return;

    const summary = await getTeacherRoomEarningsSummary(req.user.id);
    return success(res, summary);
  } catch (_err) {
    return error(res, "تعذر تحميل عمولات الغرف", 500);
  }
});

// GET /peak-api/earnings/rooms/students — الطلاب المرتبطين بالمدرس
router.get("/rooms/students", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await resolveTeacherForEarnings(req, res);
    if (!teacher) return;

    const { data, error: dbErr } = await supabase
      .from("subscription_attributions")
      .select(`
        attributed_at,
        room:study_rooms(subject, grade),
        student:users(id, full_name),
        subscription:student_subscriptions(status, current_period_end)
      `)
      .eq("teacher_id", req.user.id)
      .order("attributed_at", { ascending: false });

    if (dbErr) throw dbErr;
    return success(res, { students: data || [] });
  } catch (_err) {
    return error(res, "تعذر تحميل قائمة الطلاب", 500);
  }
});

export default router;
