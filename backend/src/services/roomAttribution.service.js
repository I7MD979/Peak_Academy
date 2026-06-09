import { supabase } from "../lib/supabase.js";

const ATTRIBUTION_WINDOW_HOURS = 24;
const COMMISSION_RATE = 0.30;

/**
 * Find which teacher to attribute a new subscription to.
 * Looks for the most recent room the student was in (within 24h) that has a teacher.
 * Returns { teacher_id, room_id } or null.
 */
export async function findAttributionForStudent(studentId) {
  const windowStart = new Date(
    Date.now() - ATTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("study_room_members")
    .select("room_id, joined_at, room:study_rooms(teacher_id)")
    .eq("user_id", studentId)
    .gt("joined_at", windowStart)
    .not("room.teacher_id", "is", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.room?.teacher_id) return null;
  if (data.room.teacher_id === studentId) return null; // teacher can't attribute to themselves

  return {
    teacher_id: data.room.teacher_id,
    room_id:    data.room_id,
  };
}

/**
 * Record attribution when a subscription is activated.
 * Safe to call — wrapped in try/catch so it never blocks subscription activation.
 */
export async function recordSubscriptionAttribution(studentId, subscriptionId) {
  try {
    const { data: existing } = await supabase
      .from("subscription_attributions")
      .select("id")
      .eq("subscription_id", subscriptionId)
      .maybeSingle();

    if (existing) return;

    const attribution = await findAttributionForStudent(studentId);
    if (!attribution) return;

    await supabase
      .from("subscription_attributions")
      .insert({
        student_id:      studentId,
        teacher_id:      attribution.teacher_id,
        subscription_id: subscriptionId,
        room_id:         attribution.room_id,
      })
      .throwOnError();

  } catch (err) {
    console.error("[roomAttribution] failed to record attribution:", err?.message);
  }
}

/**
 * Calculate monthly commissions for all teachers with active attributed students.
 * Called by cron job. month format: '2026-06'
 */
export async function calculateMonthlyCommissions(month) {
  const { data: attributions, error } = await supabase
    .from("subscription_attributions")
    .select(`
      teacher_id,
      subscription:student_subscriptions(
        id,
        status,
        current_period_end,
        plan:subscription_plans(price)
      )
    `);

  if (error) throw error;
  if (!attributions?.length) return { processed: 0 };

  // Group by teacher — only count active subscriptions
  const byTeacher = {};
  for (const attr of attributions) {
    const sub = attr.subscription;
    if (!sub || sub.status !== "active") continue;

    const price = Number(sub.plan?.price || 49);
    const tid = attr.teacher_id;

    if (!byTeacher[tid]) byTeacher[tid] = { count: 0, gross: 0 };
    byTeacher[tid].count++;
    byTeacher[tid].gross += price;
  }

  const entries = Object.entries(byTeacher);
  for (const [teacherId, data] of entries) {
    const commission = Math.round(data.gross * COMMISSION_RATE * 100) / 100;

    const { error: upsertErr } = await supabase
      .from("room_commission_earnings")
      .upsert(
        {
          teacher_id:        teacherId,
          period_month:      month,
          student_count:     data.count,
          gross_amount:      data.gross,
          commission_rate:   COMMISSION_RATE,
          commission_amount: commission,
          status:            "pending",
        },
        { onConflict: "teacher_id,period_month" }
      );

    if (upsertErr) {
      console.error(
        `[commission] upsert failed for teacher ${teacherId}:`,
        upsertErr.message
      );
    }
  }

  return { processed: entries.length };
}

/**
 * Get a teacher's full room commission summary for the earnings page.
 */
export async function getTeacherRoomEarningsSummary(teacherId) {
  const [{ data: earnings }, { data: attributions }] = await Promise.all([
    supabase
      .from("room_commission_earnings")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("period_month", { ascending: false }),

    supabase
      .from("subscription_attributions")
      .select("subscription:student_subscriptions(status)")
      .eq("teacher_id", teacherId),
  ]);

  const rows          = earnings || [];
  const totalEarned   = rows.reduce((s, r) => s + Number(r.commission_amount), 0);
  const pendingAmount = rows
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + Number(r.commission_amount), 0);
  const paidAmount    = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.commission_amount), 0);
  const activeStudents = (attributions || []).filter(
    (a) => a.subscription?.status === "active"
  ).length;

  return {
    total_earned:    totalEarned,
    pending_amount:  pendingAmount,
    paid_amount:     paidAmount,
    active_students: activeStudents,
    earnings:        rows,
  };
}
