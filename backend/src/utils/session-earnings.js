import { supabase } from "../lib/supabase.js";
import { getSessionPrice, getTeacherShare } from "../services/platformConfig.service.js";
import { isSchemaV2 } from "../lib/schema.js";

async function countAttendedEnrollments(sessionId) {
  if (isSchemaV2()) {
    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("status", "attended");
    return count || 0;
  }

  const { count } = await supabase
    .from("session_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "attended");
  return count || 0;
}

export async function recordSessionEarnings(sessionId, teacherId) {
  const { data: existing } = await supabase
    .from("teacher_earnings")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) return existing;

  const attendeeCount = await countAttendedEnrollments(sessionId);
  const price = await getSessionPrice();
  const teacherShare = await getTeacherShare();
  const gross = attendeeCount * price;
  const teacher_amount = Math.round(gross * teacherShare * 100) / 100;
  const platform_amount = Math.round((gross - teacher_amount) * 100) / 100;

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
  if (isSchemaV2()) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("session_id", sessionId)
      .eq("status", "attended");

    if (!enrollments?.length) return;

    await Promise.all(
      enrollments.map(async ({ student_id: userId }) => {
        const { data: profile } = await supabase
          .from("student_profiles")
          .select("id, streak_days")
          .eq("user_id", userId)
          .maybeSingle();
        if (!profile) return;
        await supabase
          .from("student_profiles")
          .update({ streak_days: (profile.streak_days || 0) + 1 })
          .eq("id", profile.id);
      })
    );
    return;
  }

  const { data: enrollments } = await supabase
    .from("session_enrollments")
    .select("student_id")
    .eq("session_id", sessionId)
    .eq("status", "attended");

  if (!enrollments?.length) return;

  await Promise.all(
    enrollments.map(async ({ student_id }) => {
      const { data: profile } = await supabase
        .from("student_profiles")
        .select("streak_days")
        .eq("id", student_id)
        .single();
      await supabase
        .from("student_profiles")
        .update({ streak_days: (profile?.streak_days || 0) + 1 })
        .eq("id", student_id);
    })
  );
}
