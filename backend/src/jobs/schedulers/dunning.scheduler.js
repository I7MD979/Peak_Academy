import { supabase } from "../../lib/supabase.js";
import { enqueueJob } from "../../lib/queue.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const twoDaysAgo = () => new Date(Date.now() - 2 * 86400000).toISOString();

function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * 86400000).toISOString();
}

export async function processDunning() {
  const now = new Date();
  console.info("[Dunning] Running at", now.toISOString());

  try {
    await supabase
      .from("student_subscriptions")
      .update({ status: "past_due" })
      .eq("status", "grace")
      .lt("grace_period_ends_at", now.toISOString());

    const { data: configRows } = await supabase.from("saas_config").select("key, value");
    const config = Object.fromEntries((configRows || []).map((r) => [r.key, r.value]));

    const { data: subs } = await supabase
      .from("student_subscriptions")
      .select("id, student_id, dunning_attempt_count, last_dunning_at")
      .eq("status", "past_due")
      .lt("dunning_attempt_count", 3)
      .or(`last_dunning_at.is.null,last_dunning_at.lt.${twoDaysAgo()}`);

    for (const sub of subs || []) {
      const attempt = (sub.dunning_attempt_count || 0) + 1;
      const isLastAttempt = attempt >= 3;

      const { data: user } = await supabase
        .from("users")
        .select("email, full_name, phone")
        .eq("id", sub.student_id)
        .maybeSingle();

      await enqueueJob("email", "dunning-email", {
        userId: sub.student_id,
        email: user?.email,
        name: user?.full_name,
        attempt,
        isLastAttempt,
        renewUrl: `${(process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "")}/student/subscription`
      });

      await supabase.from("dunning_logs").insert({
        subscription_id: sub.id,
        user_id: sub.student_id,
        attempt_number: attempt,
        channel: "email",
        status: "sent"
      });

      await supabase
        .from("student_subscriptions")
        .update({
          dunning_attempt_count: attempt,
          last_dunning_at: now.toISOString()
        })
        .eq("id", sub.id);
    }

    const retentionDays = parseInt(config.data_retention_days || "30", 10);
    await supabase
      .from("student_subscriptions")
      .update({
        status: "expired",
        data_deletion_at: addDays(now, retentionDays)
      })
      .eq("status", "past_due")
      .gte("dunning_attempt_count", 3);

    console.info("[Dunning] Complete");
  } catch (err) {
    console.error("[Dunning] Error:", err.message);
  }
}

export function startDunningScheduler() {
  const enabled = process.env.FF_DUNNING_SCHEDULER !== "false";
  if (!enabled) return;

  const tick = () => processDunning().catch((err) => console.error("[Dunning] tick failed:", err.message));

  tick();
  setInterval(tick, DAY_MS);
  console.info("Dunning scheduler started");
}
