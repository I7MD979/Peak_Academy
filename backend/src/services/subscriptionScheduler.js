import { supabase } from "../lib/supabase.js";
import { resetMonthlySubscriptions } from "../jobs/subscriptionReset.js";
import { expireTrials } from "./trialService.js";
import {
  calculateMonthlyPayouts,
  openPayoutWindow,
} from "../jobs/monthlyPayout.job.js";
import {
  isPayoutCalcDay,
  getCurrentPayoutMonth,
} from "../services/platformConfig.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export function startSubscriptionResetScheduler() {
  const enabled = process.env.FF_SUBSCRIPTION_RESET !== "false";
  if (!enabled) return;

  const tick = async () => {
    try {
      const result = await resetMonthlySubscriptions();
      if (result.reset > 0) {
        console.log(`subscription reset: ${result.reset} subscription(s) renewed`);
      }
    } catch (err) {
      console.error("subscription reset tick failed", err.message);
    }

    try {
      const result = await expireTrials();
      if (result.expired > 0) {
        console.log(`trial expiry: ${result.expired} trial(s) expired`);
      }
    } catch (err) {
      console.error("trial expiry tick failed", err.message);
    }

    // Revoke expired raise_hand_queue grants (BUG-09 crash-safe replacement for setTimeout)
    try {
      await supabase
        .from("raise_hand_queue")
        .update({ status: "dismissed" })
        .eq("status", "granted")
        .lt("expires_at", new Date().toISOString());
    } catch (err) {
      console.error("[scheduler] raise-hand revoke failed:", err.message);
    }

    // Day 25: calculate monthly payouts (sessions + rooms)
    if (isPayoutCalcDay()) {
      try {
        const result = await calculateMonthlyPayouts(getCurrentPayoutMonth());
        console.log(`[scheduler] payout calculation: ${result.processed} teachers`);
      } catch (err) {
        console.error("[scheduler] payout calculation failed:", err.message);
      }
    }

    // Day 26: open withdrawal window
    if (new Date().getDate() === 26) {
      try {
        const result = await openPayoutWindow(getCurrentPayoutMonth());
        console.log(`[scheduler] withdrawal window opened for ${result.opened} teachers`);
      } catch (err) {
        console.error("[scheduler] open window failed:", err.message);
      }
    }

    // Day 1: calculate room commissions for the previous month
    if (new Date().getDate() === 1) {
      try {
        const { runMonthlyCommissionsJob } = await import("../jobs/monthlyCommissions.job.js");
        await runMonthlyCommissionsJob();
        console.log("[scheduler] room commissions calculated");
      } catch (err) {
        console.error("[scheduler] room commissions failed:", err.message);
      }
    }
  };

  tick();
  setInterval(tick, DAY_MS);
}
