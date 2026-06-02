import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";

const router = Router();
const MIN_WITHDRAWAL = 50;

async function getTeacherProfile(userId, res) {
  const { data: teacher, error: dbError } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (dbError || !teacher) {
    error(res, "ملف المدرس غير موجود", 404);
    return null;
  }

  return teacher;
}

async function getTeacherBalance(teacherId) {
  const [{ data: earnings }, { data: withdrawals }] = await Promise.all([
    supabase.from("teacher_earnings").select("teacher_amount, status, created_at").eq("teacher_id", teacherId),
    supabase
      .from("withdrawal_requests")
      .select("amount, status, requested_at")
      .eq("teacher_id", teacherId)
  ]);

  const earningRows = earnings || [];
  const withdrawalRows = withdrawals || [];

  const totalEarnings = earningRows.reduce((sum, row) => sum + Number(row.teacher_amount || 0), 0);
  const pendingEarnings = earningRows
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + Number(row.teacher_amount || 0), 0);
  const paidEarnings = earningRows
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + Number(row.teacher_amount || 0), 0);

  const lockedInWithdrawals = withdrawalRows
    .filter((row) => row.status === "pending" || row.status === "approved")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const withdrawnTotal = withdrawalRows
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const availableBalance = Math.max(0, pendingEarnings - lockedInWithdrawals);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const thisMonthEarnings = earningRows
    .filter((row) => new Date(row.created_at).getTime() >= monthStart.getTime())
    .reduce((sum, row) => sum + Number(row.teacher_amount || 0), 0);

  const pendingWithdrawalCount = withdrawalRows.filter((row) => row.status === "pending").length;

  return {
    total_earnings: totalEarnings,
    pending_earnings: pendingEarnings,
    paid_earnings: paidEarnings,
    available_balance: availableBalance,
    locked_in_withdrawals: lockedInWithdrawals,
    withdrawn_total: withdrawnTotal,
    this_month_earnings: thisMonthEarnings,
    pending_withdrawal_count: pendingWithdrawalCount,
    earnings_count: earningRows.length
  };
}

router.get("/summary", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id, res);
    if (!teacher) return;

    const balance = await getTeacherBalance(teacher.id);
    return success(res, balance);
  } catch (_err) {
    return error(res, "تعذر تحميل ملخص الأرباح", 500);
  }
});

router.get("/withdrawals", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id, res);
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
    const teacher = await getTeacherProfile(req.user.id, res);
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
    const teacher = await getTeacherProfile(req.user.id, res);
    if (!teacher) return;

    const amount = Number(req.body.amount);
    const method = String(req.body.method || "").trim();
    const accountNumber = String(req.body.account_number || "").trim();

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
