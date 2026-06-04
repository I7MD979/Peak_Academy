import { resetMonthlySubscriptions } from "../jobs/subscriptionReset.js";

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
  };

  tick();
  setInterval(tick, DAY_MS);
}
