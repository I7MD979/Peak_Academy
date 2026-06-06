/**
 * Google OAuth Security
 * OWASP A01, A07 | NIST IA-8
 */

import { rateLimit } from "express-rate-limit";

const ALLOWED_EMAIL_DOMAINS = process.env.ALLOWED_EMAIL_DOMAINS
  ? process.env.ALLOWED_EMAIL_DOMAINS.split(",").map((d) => d.trim().toLowerCase())
  : null;

const BLOCKED_PATTERNS = [
  /\+.+@/,
  /\.{2,}/,
  /@.*@/
];

/**
 * التحقق من صحة الـ Google OAuth callback
 * OWASP A01 — Broken Access Control
 */
export function validateOAuthCallback(req, res, next) {
  const { code, state, error: oauthError } = req.query;
  const frontendUrl = (process.env.FRONTEND_URL || "https://peak-academy.net").replace(/\/$/, "");

  if (oauthError) {
    console.warn(`[oauth] error from Google: ${oauthError} — IP: ${req.ip}`);
    return res.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
  }

  if (!code || typeof code !== "string" || code.length > 512) {
    return res.redirect(`${frontendUrl}/auth/login?error=invalid_code`);
  }

  if (!state || typeof state !== "string" || state.length > 256) {
    return res.redirect(`${frontendUrl}/auth/login?error=invalid_state`);
  }

  next();
}

/**
 * التحقق من الـ email بعد الـ OAuth
 * OWASP A07 | NIST IA-5
 */
export function validateOAuthEmail(email) {
  if (!email || typeof email !== "string") return { valid: false, reason: "no_email" };

  const normalized = email.toLowerCase().trim();

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return { valid: false, reason: "suspicious_email" };
    }
  }

  if (ALLOWED_EMAIL_DOMAINS) {
    const domain = normalized.split("@")[1];
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
      return { valid: false, reason: "domain_not_allowed" };
    }
  }

  return { valid: true };
}

export const oauthLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { success: false, error: "محاولات تسجيل كثيرة — انتظر 10 دقائق", code: "OAUTH_RATE_LIMIT" },
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: false
});

/**
 * منع Open Redirect في الـ OAuth redirect_to
 * OWASP A01
 */
export function validateRedirectUrl(req, res, next) {
  const redirectTo = req.query.redirect_to || req.body.redirect_to;
  if (!redirectTo) return next();

  const frontendUrl = (process.env.FRONTEND_URL || "https://peak-academy.net").replace(/\/$/, "");
  const allowedPrefixes = [frontendUrl, "http://localhost:3000", "http://127.0.0.1:3000"];

  const isAllowed = allowedPrefixes.some(
    (prefix) => redirectTo.startsWith(`${prefix}/`) || redirectTo === prefix
  );

  if (!isAllowed) {
    console.warn(`[oauth] blocked open redirect attempt: ${redirectTo} — IP: ${req.ip}`);
    const safeTarget = `${frontendUrl}/student/dashboard`;
    req.query.redirect_to = safeTarget;
    if (req.body && typeof req.body === "object") {
      req.body.redirect_to = safeTarget;
    }
  }

  next();
}

/**
 * Token binding — soft check (log only)
 * NIST IA-11
 */
export function validateTokenBinding(req, _res, next) {
  const tokenIp = req.headers["x-original-ip"] || req.headers["x-forwarded-for"]?.split(",")[0];
  if (tokenIp && req.user?.ip && tokenIp !== req.user.ip) {
    console.warn(`[auth] IP change detected: ${req.user.ip} → ${tokenIp} — User: ${req.user?.id}`);
  }
  next();
}
