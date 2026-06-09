import { supabase } from "../lib/supabase.js";
import { isSchemaV2 } from "../lib/schema.js";

function slugFromUser(user) {
  const base = (user.full_name || user.email || user.id || "user")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
  return `PEAK-${base || "STUDENT"}`;
}

export async function ensureReferralCode(user) {
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) return existing;

  let code = slugFromUser(user);
  let attempt = 0;
  while (attempt < 5) {
    const { data: conflict } = await supabase
      .from("referral_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!conflict) break;
    code = `${slugFromUser(user)}${attempt + 1}`;
    attempt += 1;
  }

  const { data: created, error } = await supabase
    .from("referral_codes")
    .insert({ owner_id: user.id, code })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data: retry } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    return retry;
  }
  if (error) throw error;
  return created;
}

async function countPriorPaidEnrollments(userId) {
  if (isSchemaV2()) {
    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("payment_status", "paid")
      .in("status", ["confirmed", "attended"]);
    return count || 0;
  }

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!student) return 0;

  const { count } = await supabase
    .from("session_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("student_id", student.id)
    .not("payment_id", "is", null)
    .in("status", ["enrolled", "attended"]);
  return count || 0;
}

export async function creditReferrerOnFirstPaidEnrollment(userId, promotionId) {
  if (!promotionId) return;

  const { data: alreadyRewarded } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_id", userId)
    .eq("status", "rewarded")
    .maybeSingle();
  if (alreadyRewarded) return;

  const { data: promo } = await supabase
    .from("promotions")
    .select("code, type")
    .eq("id", promotionId)
    .maybeSingle();
  if (promo?.type !== "referral") return;

  const { data: refCode } = await supabase
    .from("referral_codes")
    .select("owner_id, id, total_referrals, earned_sessions, conversions")
    .eq("code", promo.code)
    .maybeSingle();
  if (!refCode || refCode.owner_id === userId) return;

  const priorPaid = await countPriorPaidEnrollments(userId);
  if (priorPaid > 0) return;

  await supabase
    .from("referral_codes")
    .update({
      total_referrals: (refCode.total_referrals || 0) + 1,
      earned_sessions: (refCode.earned_sessions || 0) + 1,
      conversions: (refCode.conversions || 0) + 1
    })
    .eq("id", refCode.id);

  const { data: activeSub } = await supabase
    .from("student_subscriptions")
    .select("id, sessions_remaining")
    .eq("student_id", refCode.owner_id)
    .eq("status", "active")
    .maybeSingle();

  if (activeSub) {
    await supabase
      .from("student_subscriptions")
      .update({ sessions_remaining: (activeSub.sessions_remaining || 0) + 1 })
      .eq("id", activeSub.id);
  }

  await supabase.from("referrals").upsert(
    {
      referrer_id: refCode.owner_id,
      referred_id: userId,
      referral_code_id: refCode.id,
      status: "rewarded",
      rewarded_at: new Date().toISOString()
    },
    { onConflict: "referred_id" }
  );
}

export async function trackReferralClick(code) {
  const { data: refCode } = await supabase
    .from("referral_codes")
    .select("id, clicks")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (!refCode) return null;

  await supabase
    .from("referral_codes")
    .update({ clicks: (refCode.clicks || 0) + 1 })
    .eq("id", refCode.id);

  return refCode;
}
