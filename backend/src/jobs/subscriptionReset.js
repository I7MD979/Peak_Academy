import { supabase } from "../lib/supabase.js";

export async function resetMonthlySubscriptions() {
  const now = new Date().toISOString();

  const { data: expiredSubs, error } = await supabase
    .from("student_subscriptions")
    .select("*, plan:subscription_plans(*)")
    .eq("status", "active")
    .lte("current_period_end", now);

  if (error) throw error;
  if (!expiredSubs?.length) return { reset: 0 };

  let reset = 0;
  for (const sub of expiredSubs) {
    const newEnd = new Date(sub.current_period_end);
    newEnd.setMonth(newEnd.getMonth() + 1);

    const { error: updateError } = await supabase
      .from("student_subscriptions")
      .update({
        sessions_remaining: sub.plan?.sessions_per_month ?? sub.sessions_remaining,
        current_period_start: sub.current_period_end,
        current_period_end: newEnd.toISOString()
      })
      .eq("id", sub.id);

    if (!updateError) reset += 1;
  }

  return { reset };
}
