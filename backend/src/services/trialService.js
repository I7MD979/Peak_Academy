import crypto from "crypto";
import { supabase } from "../lib/supabase.js";
import { invalidateSubscriptionCaches } from "../lib/cache.js";

const TRIAL_DAYS = 30;

function sha256(str) {
  return crypto.createHash("sha256").update(String(str).toLowerCase().trim()).digest("hex");
}

/**
 * Activate a 30-day free trial for study room access.
 *
 * Enforcement:
 *  - User must be an active student
 *  - Cannot already have an active or trialing subscription
 *  - Cannot have used a trial before (status = trial_expired on any row)
 *  - One trial per email hash and per phone hash (fingerprinting)
 */
export async function activateTrial(userId) {
  // 1. Load user profile
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id, email, phone, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (userErr || !user) {
    throw Object.assign(new Error("المستخدم غير موجود"), { status: 404 });
  }
  if (!user.is_active) {
    throw Object.assign(new Error("الحساب موقوف"), { status: 403 });
  }
  if (user.role !== "student") {
    throw Object.assign(new Error("التجربة المجانية للطلاب فقط"), { status: 403 });
  }

  // 2. Check existing subscriptions
  const { data: existing } = await supabase
    .from("student_subscriptions")
    .select("id, status")
    .eq("student_id", userId)
    .in("status", ["active", "trialing", "trial_expired"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.status === "trialing") {
    throw Object.assign(new Error("لديك تجربة مجانية نشطة بالفعل"), { status: 409 });
  }
  if (existing?.status === "active") {
    throw Object.assign(new Error("لديك اشتراك مدفوع نشط بالفعل"), { status: 409 });
  }
  if (existing?.status === "trial_expired") {
    throw Object.assign(new Error("استخدمت التجربة المجانية من قبل"), { status: 409 });
  }

  // 3. Fingerprint check
  if (!user.email) {
    throw Object.assign(new Error("لا يوجد بريد إلكتروني مرتبط بالحساب"), { status: 400 });
  }

  const emailHash = sha256(user.email);
  const phoneHash = user.phone ? sha256(user.phone) : null;

  const { data: fpByEmail } = await supabase
    .from("trial_fingerprints")
    .select("id")
    .eq("email_hash", emailHash)
    .maybeSingle();

  if (fpByEmail) {
    throw Object.assign(
      new Error("تم استخدام التجربة المجانية من قبل لهذا البريد الإلكتروني"),
      { status: 409 }
    );
  }

  if (phoneHash) {
    const { data: fpByPhone } = await supabase
      .from("trial_fingerprints")
      .select("id")
      .eq("phone_hash", phoneHash)
      .maybeSingle();

    if (fpByPhone) {
      throw Object.assign(
        new Error("تم استخدام التجربة المجانية من قبل لهذا الرقم"),
        { status: 409 }
      );
    }
  }

  // 4. Create trial subscription (plan_id is null — no paid plan)
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  const { data: sub, error: subErr } = await supabase
    .from("student_subscriptions")
    .insert({
      student_id:           userId,
      plan_id:              null,
      status:               "trialing",
      sessions_remaining:   0,
      current_period_start: now.toISOString(),
      current_period_end:   trialEnd.toISOString(),
      trial_start:          now.toISOString(),
      trial_end:            trialEnd.toISOString()
    })
    .select("id, trial_end")
    .single();

  if (subErr) throw subErr;

  // 5. Store fingerprint to prevent reuse
  const { error: fpErr } = await supabase
    .from("trial_fingerprints")
    .insert({ user_id: userId, email_hash: emailHash, phone_hash: phoneHash });

  if (fpErr) throw fpErr;

  await invalidateSubscriptionCaches(userId);

  return {
    trial_end: sub.trial_end,
    days: TRIAL_DAYS,
    message: `تم تفعيل التجربة المجانية لمدة ${TRIAL_DAYS} يوماً`
  };
}

/**
 * Check if a user has access to study rooms.
 * Delegates to the has_room_access() DB function which handles
 * teachers, trialing, and active-paid in one place.
 */
export async function hasRoomAccess(userId) {
  const { data, error } = await supabase.rpc("has_room_access", { p_user_id: userId });
  if (error) throw error;
  return data === true;
}

/**
 * Expire any trials whose trial_end has passed.
 * Called by the daily scheduler — not an HTTP endpoint.
 */
export async function expireTrials() {
  const { data, error } = await supabase
    .from("student_subscriptions")
    .update({ status: "trial_expired" })
    .eq("status", "trialing")
    .lt("trial_end", new Date().toISOString())
    .select("id");

  if (error) throw error;
  return { expired: (data || []).length };
}
