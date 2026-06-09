import { supabase } from "../lib/supabase.js";

export async function resetMonthlySubscriptions() {
  const now = new Date().toISOString();

  const { data: expiredSubs, error } = await supabase
    .from("student_subscriptions")
    .select("id")
    .eq("status", "active")
    .lte("current_period_end", now);

  if (error) throw error;
  if (!expiredSubs?.length) return { reset: 0 };

  let reset = 0;
  for (const sub of expiredSubs) {
    const { error: updateError } = await supabase
      .from("student_subscriptions")
      .update({ status: "expired", sessions_remaining: 0 })
      .eq("id", sub.id);

    if (!updateError) reset += 1;
  }

  return { reset };
}
