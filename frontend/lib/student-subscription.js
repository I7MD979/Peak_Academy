/** مساعدات صفحة اشتراك الطالب */

export const SUBSCRIPTION_TX_STORAGE_KEY = "peak-sub-tx";

/** Resolve our payment/transaction id after Paymob return (txId, payment_id, or sessionStorage). */
export function resolveSubscriptionPaymentId(searchParams) {
  if (!searchParams) return null;
  return (
    searchParams.get("txId") ||
    searchParams.get("payment_id") ||
    (typeof window !== "undefined" ? sessionStorage.getItem(SUBSCRIPTION_TX_STORAGE_KEY) : null)
  );
}

export function readSubscriptionSearchParam(searchParams, key) {
  return searchParams?.get?.(key) ?? "";
}

export function isPlanHighlighted(plan, searchParams) {
  if (!plan || !searchParams) return false;
  const planParam = readSubscriptionSearchParam(searchParams, "plan");
  if (!planParam) return false;
  return plan.id === planParam || plan.name?.toLowerCase() === planParam.toLowerCase();
}

export function findAutostartPlan(plans, searchParams) {
  const planParam = readSubscriptionSearchParam(searchParams, "plan");
  const autostart = readSubscriptionSearchParam(searchParams, "autostart") === "1";
  if (!planParam || !autostart || !plans?.length) return null;
  return (
    plans.find(
      (plan) => plan.id === planParam || plan.name?.toLowerCase() === planParam.toLowerCase()
    ) || null
  );
}

export function formatSubscriptionPeriodEnd(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG");
}
