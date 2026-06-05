import { supabase } from "../lib/supabase.js";
import { ensureUserProfile } from "../utils/ensure-user-profile.js";

export async function getTeacherProfile(userId, res, errorFn) {
  let { data: teacher, error: dbError } = await supabase
    .from("teacher_profiles")
    .select("id, commission_rate, rating, review_count, bio, subjects")
    .eq("user_id", userId)
    .maybeSingle();

  if (dbError && !teacher) {
    if (errorFn && res) errorFn(res, "تعذر تحميل ملف المدرس", 500);
    return null;
  }

  if (!teacher) {
    try {
      await ensureUserProfile(supabase, {
        id: userId,
        email: "",
        full_name: "معلم",
        role: "teacher"
      });
      const retry = await supabase
        .from("teacher_profiles")
        .select("id, commission_rate, rating, review_count, bio, subjects")
        .eq("user_id", userId)
        .maybeSingle();
      teacher = retry.data;
    } catch {
      /* ensure may need email from caller */
    }
  }

  if (!teacher) {
    if (errorFn && res) errorFn(res, "ملف المدرس غير موجود", 404);
    return null;
  }

  return teacher;
}

export async function getTeacherBalance(teacherId) {
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

export async function countTeacherSessions(userId, status) {
  const { count, error: dbError } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", userId)
    .eq("status", status);

  if (dbError) return 0;
  return count || 0;
}
