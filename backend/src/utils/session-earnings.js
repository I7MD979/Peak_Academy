import { supabase } from "../lib/supabase.js";
import { getSessionPrice, getTeacherShare } from "../services/platformConfig.service.js";

export async function recordSessionEarnings(sessionId, teacherId) {
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

  const price        = await getSessionPrice();
  const teacherShare = await getTeacherShare();
  const gross          = (attendeeCount || 0) * price;
  const teacher_amount  = Math.round(gross * teacherShare * 100) / 100;
  const platform_amount = Math.round((gross - teacher_amount) * 100) / 100;

  const { data: earning, error } = await supabase
    .from("teacher_earnings")
    .insert({
      teacher_id:     teacherId,
      session_id:     sessionId,
      gross_amount:   gross,
      teacher_amount,
      platform_amount,
      status:         "pending"
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
