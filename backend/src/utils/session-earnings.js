import { supabase } from "../lib/supabase.js";

export async function recordSessionEarnings(sessionId, teacherId, commissionRate = 70) {
  const { data: existing } = await supabase
    .from("teacher_earnings")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) return existing;

  const { count: attendeeCount } = await supabase
    .from("session_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "attended");

  const { data: session } = await supabase.from("sessions").select("price_per_student").eq("id", sessionId).single();
  if (!session) return null;

  const gross = (attendeeCount || 0) * Number(session.price_per_student || 0);
  const rate = Number(commissionRate || 70);
  const teacher_amount = Number((gross * (rate / 100)).toFixed(2));
  const platform_amount = Number((gross - teacher_amount).toFixed(2));

  const { data: earning, error } = await supabase
    .from("teacher_earnings")
    .insert({
      teacher_id: teacherId,
      session_id: sessionId,
      gross_amount: gross,
      teacher_amount,
      platform_amount,
      status: "pending"
    })
    .select()
    .single();

  if (error) throw error;
  return earning;
}

export async function incrementAttendeeStreaks(sessionId) {
  const { data: enrollments } = await supabase
    .from("session_enrollments")
    .select("student_id")
    .eq("session_id", sessionId)
    .eq("status", "attended");

  if (!enrollments?.length) return;

  await Promise.all(
    enrollments.map(async ({ student_id }) => {
      const { data: profile } = await supabase.from("student_profiles").select("streak_days").eq("id", student_id).single();
      await supabase
        .from("student_profiles")
        .update({ streak_days: (profile?.streak_days || 0) + 1 })
        .eq("id", student_id);
    })
  );
}
