/**
 * CSRF Protection Middleware
 * Standard: OWASP A01 | CWE-352 | NIST SC-8
 */

import { randomBytes, timingSafeEqual } from "crypto";

const CSRF_COOKIE_NAME = "__csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TTL = 60 * 60 * 24;

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

const ORIGIN_CHECK_EXCLUDED_PREFIXES = [
  "/api/health",
  "/api/diag",
  "/api/payments/webhook",
  "/payments/webhook",
  "/api/webhooks/",
  "/api/notifications/stream"
];

export function generateCsrfToken(req, res) {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString("hex");

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: CSRF_TTL * 1000,
    path: "/"
  });

  res.json({ success: true, data: { csrfToken: token } });
}

export function validateCsrf(req, res, next) {
  if (SAFE_METHODS.includes(req.method)) return next();

  if (req.headers.authorization?.startsWith("Bearer ")) return next();

  const tokenFromCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const tokenFromHeader = req.headers[CSRF_HEADER_NAME];

  if (!tokenFromCookie || !tokenFromHeader) {
    return res.status(403).json({
      success: false,
      error: "CSRF token مفقود",
      code: "CSRF_MISSING"
    });
  }

  try {
    const bufA = Buffer.from(tokenFromCookie, "hex");
    const bufB = Buffer.from(tokenFromHeader, "hex");

    if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
      return res.status(403).json({
        success: false,
        error: "CSRF token غير صالح",
        code: "CSRF_INVALID"
      });
    }
  } catch {
    return res.status(403).json({
      success: false,
      error: "CSRF token تنسيق غير صالح",
      code: "CSRF_FORMAT_ERROR"
    });
  }

  next();
}

export function enforceSameSiteCookies(_req, res, next) {
  const originalCookie = res.cookie.bind(res);
  res.cookie = function (name, value, options = {}) {
    return originalCookie(name, value, {
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      ...options
    });
  };
  next();
}

export function validateOrigin(allowedOrigins) {
  const originSet = new Set(
    (Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins])
      .filter(Boolean)
      .map((o) => String(o).replace(/\/$/, ""))
  );

  return (req, res, next) => {
    if (SAFE_METHODS.includes(req.method)) return next();

    const path = req.originalUrl?.split("?")[0] || "";
    if (ORIGIN_CHECK_EXCLUDED_PREFIXES.some((p) => path.startsWith(p))) return next();

    if (req.headers.authorization?.startsWith("Bearer ")) return next();

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (!origin && !referer) return next();

    if (origin) {
      const normalized = origin.replace(/\/$/, "");
      if (!originSet.has(normalized)) {
        console.warn(`[csrf] Blocked request from unauthorized origin: ${origin}`);
        return res.status(403).json({
          success: false,
          error: "Origin غير مسموح",
          code: "INVALID_ORIGIN"
        });
      }
    }

    next();
  };
}
