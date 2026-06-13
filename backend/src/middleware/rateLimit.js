import { rateLimit } from "express-rate-limit";

const isProduction = process.env.NODE_ENV === "production";
const disabled =
  process.env.DISABLE_RATE_LIMIT === "true" || process.env.DISABLE_RATE_LIMIT === "1";

/** Normalized path without query string (e.g. /api/health). */
function apiPath(req) {
  const raw = req.originalUrl || req.url || "";
  return raw.split("?")[0].replace(/\/$/, "") || "/";
}

function isHealthPath(path) {
  return path === "/api/health" || path === "/health";
}

/** Public, unauthenticated read APIs under /api/public/* */
function isPublicApiPath(path) {
  return path.startsWith("/api/public/") || path.startsWith("/public/");
}

/**
 * Authenticated GET reads that fire on normal navigation (not credential submission).
 * GET /api/sessions = session list only (not /api/sessions/:id).
 */
function isAuthenticatedReadPath(req) {
  if (req.method !== "GET") return false;
  const path = apiPath(req);
  if (path === "/api/auth/me" || path === "/auth/me") return true;
  if (path === "/api/student/dashboard" || path === "/student/dashboard") return true;
  if (path === "/api/sessions" || path === "/sessions") return true;
  return false;
}

function skipAllRateLimits() {
  return disabled || !isProduction;
}

/** Paths handled by tiered limiters below — excluded from the global 300/15min bucket. */
function usesTieredRateLimit(req) {
  const path = apiPath(req);
  if (isHealthPath(path)) return true;
  if (isPublicApiPath(path)) return true;
  if (isAuthenticatedReadPath(req)) return true;
  return false;
}

const rateLimitMessage = {
  success: false,
  error: "طلبات كثيرة — انتظر قليلًا ثم أعد المحاولة"
};

/**
 * healthLimiter — 2026-06-13 (RATE_LIMIT_AUDIT_V2.md)
 * Purpose: Railway / uptime monitors hit /health frequently without tripping API caps.
 * Limit: 1000 requests per minute per IP (production).
 */
export const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProduction ? 1000 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipAllRateLimits() || !isHealthPath(apiPath(req)),
  message: rateLimitMessage
});

/**
 * publicLimiter — 2026-06-13 (RATE_LIMIT_AUDIT_V2.md)
 * Purpose: Public marketing/data endpoints (/public/landing, etc.) without auth.
 * Limit: 500 requests per minute per IP (production).
 */
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProduction ? 500 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipAllRateLimits() || !isPublicApiPath(apiPath(req)),
  message: rateLimitMessage
});

/**
 * authenticatedReadLimiter — 2026-06-13 (RATE_LIMIT_AUDIT_V2.md)
 * Purpose: High-frequency authenticated reads (dashboard, profile, session list) — separate from global cap.
 * Routes: GET /auth/me, GET /student/dashboard, GET /sessions (list only).
 * Limit: 500 requests per 15 minutes per IP (production).
 */
export const authenticatedReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 500 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipAllRateLimits() || !isAuthenticatedReadPath(req),
  message: rateLimitMessage
});

/**
 * Global API limiter — default bucket for all /api/* and /auth/* not covered by tiered limiters above.
 * Limit: 300 requests per 15 minutes per IP (production).
 */
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 300 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (skipAllRateLimits()) return true;
    const path = apiPath(req);
    if (path.includes("/payments/webhook") || path.includes("/notifications/stream")) return true;
    if (usesTieredRateLimit(req)) return true;
    return false;
  },
  message: rateLimitMessage
});
