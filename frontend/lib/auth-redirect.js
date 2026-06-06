import { sanitizeRedirectPath } from "@/lib/safe-redirect";

/** Build OAuth callback URL preserving post-auth destination (open-redirect safe). */
export function buildOAuthCallbackUrl(origin, returnPath) {
  const base = `${origin.replace(/\/$/, "")}/auth/callback`;
  const safe = sanitizeRedirectPath(returnPath);
  if (!safe) return base;
  return `${base}?next=${encodeURIComponent(safe)}`;
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
