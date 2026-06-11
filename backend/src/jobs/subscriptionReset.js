import { supabase } from "../lib/supabase.js";

export async function resetMonthlySubscriptions() {
  const now = new Date().toISOString();

  const { data: expiredSubs, error } = await supabase
    .from("student_subscriptions")
    .select("id")
    .eq("status", "active")
    .lte("current_period_end", now);

  if (error) {
    console.error("[subscriptionReset] failed to fetch expired subscriptions:", error.message);
    throw error;
  }

  if (!expiredSubs?.length) {
    console.info("[subscriptionReset] no expired subscriptions found");
    return { reset: 0 };
  }

  console.info(`[subscriptionReset] processing ${expiredSubs.length} expired subscriptions`);

  let reset = 0;
  for (const sub of expiredSubs) {
    const { error: updateError } = await supabase
      .from("student_subscriptions")
      .update({ status: "expired", sessions_remaining: 0 })
      .eq("id", sub.id);

    if (!updateError) {
      reset += 1;
    } else {
      console.error(`[subscriptionReset] failed to expire subscription ${sub.id}:`, updateError.message);
    }
  }

  console.info(`[subscriptionReset] done — reset ${reset}/${expiredSubs.length}`);
  return { reset };
}
