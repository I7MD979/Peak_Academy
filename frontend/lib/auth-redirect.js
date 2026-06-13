import { sanitizeRedirectPath } from "@/lib/safe-redirect";

/** Build OAuth callback URL preserving post-auth destination (open-redirect safe).
 *  `intent` ("login" | "register") tells /auth/callback whether a brand-new Google
 *  account should be rejected (login) or allowed to proceed to onboarding (register). */
export function buildOAuthCallbackUrl(origin, returnPath, intent) {
  const base = `${origin.replace(/\/$/, "")}/auth/callback`;
  const safe = sanitizeRedirectPath(returnPath);
  const params = new URLSearchParams();
  if (safe) params.set("next", safe);
  if (intent === "login" || intent === "register") params.set("intent", intent);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Append safe return path for onboarding continuation after Google signup. */
export function appendNextParam(path, nextPath) {
  const safe = sanitizeRedirectPath(nextPath);
  if (!safe) return path;
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}next=${encodeURIComponent(safe)}`;
}

/** Read deferred post-auth path from onboarding/callback query. */
export function readNextParam(searchParams) {
  const raw = searchParams?.get?.("next") ?? searchParams?.next ?? null;
  return sanitizeRedirectPath(raw);
}

/** Login URL that returns the user to onboarding (preserving deferred checkout/plan path). */
export function buildOnboardingLoginUrl(deferredReturn = null) {
  const onboardingPath = deferredReturn
    ? appendNextParam("/onboarding", deferredReturn)
    : "/onboarding";
  return `/auth/login?redirect=${encodeURIComponent(onboardingPath)}`;
}
