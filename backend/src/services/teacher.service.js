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
  const now   = new Date();
  const month = now.toISOString().slice(0, 7);

  const [
    { data: earnings },
    { data: withdrawals },
    { data: currentPayout },
    { data: roomEarnings },
  ] = await Promise.all([
    supabase
      .from("teacher_earnings")
      .select("teacher_amount, status, created_at")
      .eq("teacher_id", teacherId),

    supabase
      .from("withdrawal_requests")
      .select("amount, status, requested_at")
      .eq("teacher_id", teacherId),

    supabase
      .from("monthly_payouts")
      .select("total_amount, status, payout_month, session_teacher_cut, room_commission")
      .eq("teacher_id", teacherId)
      .eq("payout_month", month)
      .maybeSingle(),

    supabase
      .from("room_commission_earnings")
      .select("commission_amount, status, period_month")
      .eq("teacher_id", teacherId)
      .eq("status", "pending"),
  ]);

  const earningRows    = earnings    || [];
  const withdrawalRows = withdrawals || [];
  const roomRows       = roomEarnings || [];

  const sessionPending = earningRows
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + Number(r.teacher_amount || 0), 0);

  const sessionPaid = earningRows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.teacher_amount || 0), 0);

  const roomPending = roomRows
    .reduce((s, r) => s + Number(r.commission_amount || 0), 0);

  const totalPending = round2(sessionPending + roomPending);

  const lockedInWithdrawals = withdrawalRows
    .filter((r) => r.status === "pending" || r.status === "approved")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const withdrawnTotal = withdrawalRows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const availableBalance = Math.max(0, round2(totalPending - lockedInWithdrawals));

  const today        = now.getDate();
  const isWindowOpen = today === 26 || today === 27;
  const payoutDay    = 27;

  const nextPayout = new Date(now.getFullYear(), now.getMonth(), payoutDay);
  if (nextPayout.getTime() <= now.getTime()) {
    nextPayout.setMonth(nextPayout.getMonth() + 1);
  }
  const daysUntilPayout = Math.ceil(
    (nextPayout.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const pendingWithdrawalCount = withdrawalRows.filter((r) => r.status === "pending").length;

  return {
    total_earnings:    round2(sessionPaid + sessionPending + roomPending + withdrawnTotal),
    total_pending:     totalPending,
    session_pending:   round2(sessionPending),
    room_pending:      round2(roomPending),
    available_balance: availableBalance,
    withdrawn_total:   round2(withdrawnTotal),
    locked_in_withdrawals: round2(lockedInWithdrawals),

    this_month_payout: currentPayout
      ? {
          total:        Number(currentPayout.total_amount),
          sessions:     Number(currentPayout.session_teacher_cut),
          rooms:        Number(currentPayout.room_commission),
          status:       currentPayout.status,
          can_withdraw: currentPayout.status === "window_open",
        }
      : null,

    payout_day:               payoutDay,
    days_until_payout:        Math.max(0, Math.ceil(daysUntilPayout)),
    is_window_open:           isWindowOpen,
    pending_withdrawal_count: pendingWithdrawalCount,

    // legacy fields for backwards compat
    this_month_earnings:      round2(sessionPending),
    earnings_count:           earningRows.length,
  };
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
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
