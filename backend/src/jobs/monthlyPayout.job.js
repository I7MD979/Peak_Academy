import { supabase } from "../lib/supabase.js";
import {
  getTeacherShare,
  getPlatformCommission,
  getCurrentPayoutMonth,
} from "../services/platformConfig.service.js";

/**
 * DAY 25 — Calculate all earnings for the month
 */
export async function calculateMonthlyPayouts(month) {
  const targetMonth = month || getCurrentPayoutMonth();
  console.info(`[payout-job] calculating payouts for ${targetMonth}`);

  // Ensure room commissions are calculated before combining totals
  const { count: roomCount } = await supabase
    .from("room_commission_earnings")
    .select("*", { count: "exact", head: true })
    .eq("period_month", targetMonth);

  if (!roomCount || roomCount === 0) {
    console.info(`[payout-job] pre-calculating room commissions for ${targetMonth}`);
    const { calculateMonthlyCommissions } = await import("../services/roomAttribution.service.js");
    await calculateMonthlyCommissions(targetMonth).catch((err) =>
      console.error("[payout-job] pre-calc failed:", err.message)
    );
  }

  await getTeacherShare();
  await getPlatformCommission();

  const nextMonth = getNextMonthStart(targetMonth);

  const [{ data: sessionEarnings, error: seErr }, { data: roomEarnings, error: reErr }] =
    await Promise.all([
      supabase
        .from("teacher_earnings")
        .select("teacher_id, teacher_amount, gross_amount, session_id")
        .gte("created_at", `${targetMonth}-01`)
        .lt("created_at", nextMonth)
        .eq("status", "pending"),

      supabase
        .from("room_commission_earnings")
        .select("teacher_id, student_count, gross_amount, commission_amount")
        .eq("period_month", targetMonth)
        .eq("status", "pending"),
    ]);

  if (seErr) throw seErr;
  if (reErr) throw reErr;

  const { data: teacherProfiles } = await supabase.from("teacher_profiles").select("id, user_id");
  const profileToUser = Object.fromEntries((teacherProfiles || []).map((p) => [p.id, p.user_id]));

  const byTeacher = {};

  for (const row of sessionEarnings || []) {
    const tid = profileToUser[row.teacher_id] || row.teacher_id;
    if (!byTeacher[tid]) byTeacher[tid] = emptyEntry();
    byTeacher[tid].session_count++;
    byTeacher[tid].session_gross += Number(row.gross_amount || 0);
    byTeacher[tid].session_teacher_cut += Number(row.teacher_amount || 0);
  }

  for (const row of roomEarnings || []) {
    const tid = row.teacher_id;
    if (!byTeacher[tid]) byTeacher[tid] = emptyEntry();
    byTeacher[tid].room_student_count += Number(row.student_count || 0);
    byTeacher[tid].room_gross += Number(row.gross_amount || 0);
    byTeacher[tid].room_commission += Number(row.commission_amount || 0);
  }

  const entries = Object.entries(byTeacher);
  let processed = 0;

  for (const [teacherId, data] of entries) {
    const total = round2(data.session_teacher_cut + data.room_commission);
    if (total <= 0) continue;

    const { error: uErr } = await supabase.from("monthly_payouts").upsert(
      {
        teacher_id:          teacherId,
        payout_month:        targetMonth,
        payout_day:          27,
        session_count:       data.session_count,
        session_gross:       round2(data.session_gross),
        session_teacher_cut: round2(data.session_teacher_cut),
        room_student_count:  data.room_student_count,
        room_gross:          round2(data.room_gross),
        room_commission:     round2(data.room_commission),
        total_amount:        total,
        status:              "calculated",
        calculated_at:       new Date().toISOString(),
      },
      { onConflict: "teacher_id,payout_month" }
    );

    if (uErr) {
      console.error(`[payout-job] upsert failed for teacher ${teacherId}:`, uErr.message);
    } else {
      processed++;
    }
  }

  console.info(`[payout-job] calculated ${processed} teacher payouts for ${targetMonth}`);
  return { processed, month: targetMonth };
}

/**
 * DAY 26 — Open withdrawal window: calculated → window_open
 */
export async function openPayoutWindow(month) {
  const targetMonth = month || getCurrentPayoutMonth();
  console.info(`[payout-job] opening withdrawal window for ${targetMonth}`);

  const { data, error } = await supabase
    .from("monthly_payouts")
    .update({
      status:           "window_open",
      window_opened_at: new Date().toISOString(),
    })
    .eq("payout_month", targetMonth)
    .eq("status", "calculated")
    .select("teacher_id, total_amount");

  if (error) throw error;

  console.info(`[payout-job] window opened for ${data?.length || 0} teachers`);
  return { opened: data?.length || 0 };
}

/**
 * DAY 27 — Get payout list for admin
 */
export async function getPayoutList(month) {
  const targetMonth = month || getCurrentPayoutMonth();

  const { data, error } = await supabase
    .from("monthly_payouts")
    .select(`
      *,
      teacher:users(id, full_name, email, phone),
      withdrawal:withdrawal_requests(
        id, amount, method, account_number, status, requested_at
      )
    `)
    .eq("payout_month", targetMonth)
    .in("status", ["window_open", "processing"])
    .order("total_amount", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Mark payout as paid and update underlying earnings tables
 */
export async function markPayoutPaid(teacherId, month) {
  const targetMonth = month || getCurrentPayoutMonth();
  const nextMonth   = getNextMonthStart(targetMonth);
  const paidAt      = new Date().toISOString();

  const { data: profile } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("user_id", teacherId)
    .maybeSingle();
  const sessionEarningsTeacherId = profile?.id || teacherId;

  const results = await Promise.allSettled([
    supabase
      .from("monthly_payouts")
      .update({ status: "paid", paid_at: paidAt })
      .eq("teacher_id", teacherId)
      .eq("payout_month", targetMonth),

    supabase
      .from("teacher_earnings")
      .update({ status: "paid", paid_at: paidAt })
      .eq("teacher_id", sessionEarningsTeacherId)
      .eq("status", "pending")
      .gte("created_at", `${targetMonth}-01`)
      .lt("created_at", nextMonth),

    supabase
      .from("room_commission_earnings")
      .update({ status: "paid", paid_at: paidAt })
      .eq("teacher_id", teacherId)
      .eq("period_month", targetMonth)
      .eq("status", "pending"),
  ]);

  // monthly_payouts must succeed
  if (results[0].status === "rejected") {
    throw new Error(`Failed to mark payout: ${results[0].reason?.message}`);
  }

  for (const [i, r] of results.entries()) {
    if (r.status === "rejected") {
      console.error(`[markPayoutPaid] step ${i} failed for ${teacherId}:`, r.reason?.message);
    }
  }

  // Close any approved withdrawal requests for this month
  await supabase
    .from("withdrawal_requests")
    .update({ status: "paid", processed_at: paidAt })
    .eq("teacher_id", teacherId)
    .eq("payout_month", targetMonth)
    .eq("status", "approved")
    .catch((err) => console.error("[markPayoutPaid] withdrawal update failed:", err.message));
}

function emptyEntry() {
  return {
    session_count: 0,
    session_gross: 0,
    session_teacher_cut: 0,
    room_student_count: 0,
    room_gross: 0,
    room_commission: 0,
  };
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function getNextMonthStart(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  const next = new Date(y, m, 1);
  return next.toISOString().slice(0, 10);
}
