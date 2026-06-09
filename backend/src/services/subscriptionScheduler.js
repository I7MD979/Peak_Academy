import { resetMonthlySubscriptions } from "../jobs/subscriptionReset.js";
import { expireTrials } from "./trialService.js";
import { runMonthlyCommissionsJob } from "../jobs/monthlyCommissions.job.js";

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

    // Run monthly commission calculation on the 1st of each month
    if (new Date().getDate() === 1) {
      try {
        await runMonthlyCommissionsJob(); // uses previous month by default
      } catch (err) {
        console.error("monthly commissions tick failed", err.message);
      }
    }
  };

  tick();
  setInterval(tick, DAY_MS);
}
