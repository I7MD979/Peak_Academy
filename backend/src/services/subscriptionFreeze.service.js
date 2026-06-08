import { supabase } from "../lib/supabase.js";
import { enqueueJob } from "../lib/queue.js";

async function loadSaasConfig() {
  const { data: rows } = await supabase.from("saas_config").select("key, value");
  const config = {};
  for (const row of rows || []) {
    config[row.key] = row.type === "int" ? parseInt(row.value, 10) : row.value;
  }
  return {
    min_freeze_days: config.min_freeze_days ?? 7,
    max_freeze_days: config.max_freeze_days ?? 30,
    max_freezes_per_year: config.max_freezes_per_year ?? 2
  };
}

export async function freezeSubscription(userId, { days, reason }) {
  const config = await loadSaasConfig();

  if (days < config.min_freeze_days || days > config.max_freeze_days) {
    const err = new Error(`مدة الفريز بين ${config.min_freeze_days} و ${config.max_freeze_days} يوم`);
    err.status = 400;
    throw err;
  }

  const { data: sub } = await supabase
    .from("student_subscriptions")
    .select("*")
    .eq("student_id", userId)
    .in("status", ["active", "grace"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    const err = new Error("لا يوجد اشتراك نشط");
    err.status = 404;
    throw err;
  }

  if (sub.status === "frozen") {
    const err = new Error("الاشتراك مجمد بالفعل");
    err.status = 400;
    throw err;
  }

  if ((sub.freeze_count || 0) >= config.max_freezes_per_year) {
    const err = new Error(`استنفدت عدد مرات الفريز المسموح بها (${config.max_freezes_per_year} مرات سنوياً)`);
    err.status = 400;
    throw err;
  }

  const frozenUntil = new Date(Date.now() + days * 86400000);
  const newExpiry = new Date(new Date(sub.current_period_end).getTime() + days * 86400000);

  await supabase
    .from("student_subscriptions")
    .update({
      status: "frozen",
      frozen_at: new Date().toISOString(),
      frozen_until: frozenUntil.toISOString(),
      current_period_end: newExpiry.toISOString(),
      freeze_count: (sub.freeze_count || 0) + 1,
      freeze_reason: reason || null
    })
    .eq("id", sub.id);

  await enqueueJob("email", "subscription-unfreeze-reminder", {
    userId,
    subscriptionId: sub.id,
    frozenUntil: frozenUntil.toISOString(),
    delayDays: days
  });

  return {
    frozenUntil: frozenUntil.toISOString(),
    newExpiryDate: newExpiry.toISOString(),
    message: `تم تجميد اشتراكك حتى ${frozenUntil.toLocaleDateString("ar-EG")}`
  };
}

export async function unfreezeSubscription(userId) {
  const { data: sub } = await supabase
    .from("student_subscriptions")
    .select("*")
    .eq("student_id", userId)
    .eq("status", "frozen")
    .maybeSingle();

  if (!sub) {
    const err = new Error("لا يوجد اشتراك مجمد");
    err.status = 404;
    throw err;
  }

  await supabase
    .from("student_subscriptions")
    .update({
      status: "active",
      frozen_at: null,
      frozen_until: null
    })
    .eq("id", sub.id);

  return { message: "تم إلغاء تجميد الاشتراك" };
}
