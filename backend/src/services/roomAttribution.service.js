import { supabase } from "../lib/supabase.js";
import { getPlatformCommission, getPlatformConfig } from "./platformConfig.service.js";

const ATTRIBUTION_WINDOW_HOURS = 72;
const MIN_OVERLAP_MINUTES = 30;

/**
 * احسب كل فترات الـ overlap بين المدرس والطالب جوه الغرفة.
 */
async function getOverlapPeriods(teacherId, studentId, roomId) {
  const [{ data: teacherSessions }, { data: studentSessions }] = await Promise.all([
    supabase
      .from("study_room_members")
      .select("joined_at, left_at")
      .eq("room_id", roomId)
      .eq("user_id", teacherId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("study_room_members")
      .select("joined_at, left_at")
      .eq("room_id", roomId)
      .eq("user_id", studentId)
      .order("joined_at", { ascending: true })
  ]);

  if (!teacherSessions?.length || !studentSessions?.length) return [];

  const now = new Date();
  const periods = [];

  for (const teacher of teacherSessions) {
    const tStart = new Date(teacher.joined_at);
    const tEnd = teacher.left_at ? new Date(teacher.left_at) : now;

    for (const student of studentSessions) {
      const sStart = new Date(student.joined_at);
      const sEnd = student.left_at ? new Date(student.left_at) : now;

      const overlapStart = new Date(Math.max(tStart, sStart));
      const overlapEnd = new Date(Math.min(tEnd, sEnd));

      if (overlapEnd > overlapStart) {
        periods.push({ start: overlapStart, end: overlapEnd });
      }
    }
  }

  return periods;
}

/**
 * تحقق إن الطالب بعت رسالة والمدرس رد — خلال نفس فترة الـ overlap.
 */
async function hadRealInteraction(teacherId, studentId, roomId, overlapPeriods) {
  if (!overlapPeriods.length) return false;

  for (const period of overlapPeriods) {
    const [{ data: studentMessages }, { data: teacherMessages }] = await Promise.all([
      supabase
        .from("study_room_messages")
        .select("id, created_at")
        .eq("room_id", roomId)
        .eq("sender_id", studentId)
        .gte("created_at", period.start.toISOString())
        .lte("created_at", period.end.toISOString())
        .limit(1)
        .maybeSingle(),
      supabase
        .from("study_room_messages")
        .select("id, created_at")
        .eq("room_id", roomId)
        .eq("sender_id", teacherId)
        .gte("created_at", period.start.toISOString())
        .lte("created_at", period.end.toISOString())
        .limit(1)
        .maybeSingle()
    ]);

    if (studentMessages && teacherMessages) return true;
  }

  return false;
}

/**
 * إيجاد الـ attribution للطالب — الشروط الأربعة لازم تتحقق كلها.
 */
export async function findAttributionForStudent(studentId) {
  const windowStart = new Date(
    Date.now() - ATTRIBUTION_WINDOW_HOURS * 3600 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("study_room_members")
    .select("room_id, joined_at, room:study_rooms(teacher_id)")
    .eq("user_id", studentId)
    .gt("joined_at", windowStart)
    .not("room.teacher_id", "is", null)
    .order("joined_at", { ascending: true })
    .limit(5);

  if (error || !data?.length) return null;

  for (const row of data) {
    const teacherId = row.room?.teacher_id;
    if (!teacherId || teacherId === studentId) continue;

    const overlapPeriods = await getOverlapPeriods(teacherId, studentId, row.room_id);

    const totalOverlapMs = overlapPeriods.reduce(
      (sum, p) => sum + (p.end - p.start),
      0
    );
    const totalOverlapMinutes = totalOverlapMs / (1000 * 60);

    if (totalOverlapMinutes < MIN_OVERLAP_MINUTES) {
      console.log(
        `[roomAttribution] overlap ${Math.round(totalOverlapMinutes)}min < ${MIN_OVERLAP_MINUTES}min — skip`
      );
      continue;
    }

    const realInteraction = await hadRealInteraction(
      teacherId,
      studentId,
      row.room_id,
      overlapPeriods
    );

    if (!realInteraction) {
      console.log("[roomAttribution] no real interaction in overlap — skip");
      continue;
    }

    console.log(
      `[roomAttribution] ✅ real interaction confirmed: ` +
        `student ${studentId} → teacher ${teacherId} ` +
        `(overlap: ${Math.round(totalOverlapMinutes)}min)`
    );

    return {
      teacher_id: teacherId,
      room_id: row.room_id,
      first_visit: row.joined_at,
      overlap_minutes: Math.round(totalOverlapMinutes),
      window_hours: ATTRIBUTION_WINDOW_HOURS
    };
  }

  return null;
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
        student_id: studentId,
        teacher_id: attribution.teacher_id,
        subscription_id: subscriptionId,
        room_id: attribution.room_id
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
  const monthStart = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const monthEnd = new Date(y, m, 1).toISOString().slice(0, 10);

  const commissionRate = await getPlatformCommission();
  const config = await getPlatformConfig();
  const fallbackPrice = Number(config.room_sub_price || config.subscription_price || 49);

  const { data: attributions, error } = await supabase
    .from("subscription_attributions")
    .select(`
      teacher_id,
      attributed_at,
      subscription:student_subscriptions(
        id,
        status,
        current_period_start,
        current_period_end,
        plan:subscription_plans(price)
      )
    `)
    .gte("attributed_at", monthStart)
    .lt("attributed_at", monthEnd);

  if (error) throw error;
  if (!attributions?.length) return { processed: 0 };

  const byTeacher = {};
  for (const attr of attributions) {
    const sub = attr.subscription;
    if (!sub) continue;
    if (!["active", "trialing"].includes(sub.status)) continue;
    if (sub.current_period_end && sub.current_period_end < monthStart) continue;
    if (sub.current_period_start && sub.current_period_start >= monthEnd) continue;

    const price = Number(sub.plan?.price || fallbackPrice);
    const tid = attr.teacher_id;

    if (!byTeacher[tid]) byTeacher[tid] = { count: 0, gross: 0 };
    byTeacher[tid].count++;
    byTeacher[tid].gross += price;
  }

  const entries = Object.entries(byTeacher);
  for (const [teacherId, data] of entries) {
    const { data: existing } = await supabase
      .from("room_commission_earnings")
      .select("status")
      .eq("teacher_id", teacherId)
      .eq("period_month", month)
      .maybeSingle();

    if (existing?.status === "paid") continue;

    const commission = Math.round(data.gross * commissionRate * 100) / 100;
    const payload = {
      teacher_id: teacherId,
      period_month: month,
      student_count: data.count,
      gross_amount: data.gross,
      commission_rate: commissionRate,
      commission_amount: commission
    };

    if (existing) {
      await supabase
        .from("room_commission_earnings")
        .update(payload)
        .eq("teacher_id", teacherId)
        .eq("period_month", month)
        .eq("status", "pending");
    } else {
      await supabase.from("room_commission_earnings").insert({ ...payload, status: "pending" });
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
      .eq("teacher_id", teacherId)
  ]);

  const rows = earnings || [];
  const totalEarned = rows.reduce((s, r) => s + Number(r.commission_amount), 0);
  const pendingAmount = rows
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + Number(r.commission_amount), 0);
  const paidAmount = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.commission_amount), 0);
  const activeStudents = (attributions || []).filter(
    (a) => a.subscription?.status === "active"
  ).length;

  return {
    total_earned: totalEarned,
    pending_amount: pendingAmount,
    paid_amount: paidAmount,
    active_students: activeStudents,
    earnings: rows
  };
}
