import { sanitizeRedirectPath } from "@/lib/safe-redirect";

/** Build post-auth path when user selected a subscription plan from landing. */
export function buildPlanCheckoutPath(redirect, plan) {
  const safeRedirect = sanitizeRedirectPath(redirect);
  if (!safeRedirect || !plan) return safeRedirect;
  const params = new URLSearchParams();
  params.set("plan", plan);
  params.set("autostart", "1");
  const joiner = safeRedirect.includes("?") ? "&" : "?";
  return `${safeRedirect}${joiner}${params.toString()}`;
}

export function readPlanCheckoutParams(searchParams) {
  const redirect = searchParams?.get?.("redirect") ?? null;
  const plan = searchParams?.get?.("plan") ?? null;
  return { redirect, plan };
}
