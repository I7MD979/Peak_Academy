/**
 * Peak Academy — Security Middleware
 * Standards: OWASP Top 10 2021 | NIST SP 800-53 Rev 5 | CWE/SANS Top 25
 */

import { rateLimit } from "express-rate-limit";
import slowDown from "express-slow-down";
import hpp from "hpp";

// ─────────────────────────────────────────
// A01 — Broken Access Control
// ─────────────────────────────────────────

/** منع path traversal في أي URL parameter */
export function blockPathTraversal(req, res, next) {
  const raw = req.originalUrl + JSON.stringify(req.params) + JSON.stringify(req.query);
  if (/(\.\.(\/|\\|%2F|%5C)|%00|\/etc\/|\/proc\/)/.test(raw)) {
    return res.status(400).json({ success: false, error: "طلب غير صالح", code: "PATH_TRAVERSAL" });
  }
  next();
}

/** منع IDOR — تأكد إن الـ user لا يقدر يوصل لـ resource مش بتاعته */
export function selfOnly(paramKey = "userId") {
  return (req, res, next) => {
    const targetId = req.params[paramKey] || req.body[paramKey];
    if (!targetId) return next();
    if (req.user?.role === "admin") return next();
    if (req.user?.id !== targetId) {
      return res.status(403).json({ success: false, error: "غير مسموح", code: "FORBIDDEN" });
    }
    next();
  };
}

// ─────────────────────────────────────────
// A02 — Cryptographic Failures
// ─────────────────────────────────────────

/** إجبار HTTPS في production */
export function enforceHttps(req, res, next) {
  if (process.env.NODE_ENV !== "production") return next();
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  if (proto !== "https") {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
}

/** منع sensitive data في الـ logs */
export function sanitizeLogging(req, _res, next) {
  const sensitiveKeys = ["password", "token", "secret", "key", "authorization", "card", "cvv", "pin"];
  if (req.body) {
    for (const key of sensitiveKeys) {
      if (req.body[key]) req.body[key] = "[REDACTED]";
    }
  }
  next();
}

// ─────────────────────────────────────────
// A03 — Injection (SQL, XSS, NoSQL)
// ─────────────────────────────────────────

const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /data\s*:/gi,
  /vbscript\s*:/gi,
  /expression\s*\(/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi
];

function stripXSS(value) {
  if (typeof value !== "string") return value;
  let clean = value;
  for (const pattern of XSS_PATTERNS) {
    clean = clean.replace(pattern, "");
  }
  return clean.trim();
}

function deepSanitize(obj, depth = 0) {
  if (depth > 10) return obj;
  if (typeof obj === "string") return stripXSS(obj);
  if (Array.isArray(obj)) return obj.map((item) => deepSanitize(item, depth + 1));
  if (obj && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      result[key] = deepSanitize(value, depth + 1);
    }
    return result;
  }
  return obj;
}

/** XSS + NoSQL injection sanitization */
export function sanitizeInput(req, _res, next) {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.query) req.query = deepSanitize(req.query);
  if (req.params) req.params = deepSanitize(req.params);
  next();
}

/** SQL injection patterns detection */
const SQL_PATTERNS = /('|--|;|\/\*|\*\/|xp_|UNION\s+SELECT|DROP\s+TABLE|INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+SET|EXEC\s*\()/i;

export function blockSQLInjection(req, res, next) {
  const check = (obj) => {
    if (!obj) return false;
    return Object.values(obj).some((v) => typeof v === "string" && SQL_PATTERNS.test(v));
  };

  if (check(req.body) || check(req.query) || check(req.params)) {
    return res.status(400).json({ success: false, error: "طلب غير صالح", code: "INJECTION_DETECTED" });
  }
  next();
}

// ─────────────────────────────────────────
// A04 — Insecure Design
// ─────────────────────────────────────────

/** منع تخمين IDs — تأكد إن الـ IDs بصيغة UUID */
export function validateUUID(paramName = "id") {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return (req, res, next) => {
    const id = req.params[paramName];
    if (id && !UUID_RE.test(id)) {
      return res.status(400).json({ success: false, error: "معرّف غير صالح", code: "INVALID_ID" });
    }
    next();
  };
}

// ─────────────────────────────────────────
// A05 — Security Misconfiguration
// ─────────────────────────────────────────

/** Security Headers — تعزيز Helmet */
export function securityHeaders(_req, res, next) {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.removeHeader("X-Powered-By");
  next();
}

/** منع عرض internal errors في production */
export function sanitizeErrors(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  const payload = {
    success: false,
    error: isProd && status === 500 ? "حدث خطأ داخلي" : err.message || "خطأ غير متوقع",
    code: err.code || "INTERNAL_ERROR"
  };

  if (!isProd) payload.stack = err.stack;

  res.status(status).json(payload);
}

// ─────────────────────────────────────────
// A07 — Auth Failures
// ─────────────────────────────────────────

/** Rate limit قوي على auth endpoints */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, error: "محاولات كثيرة — انتظر 15 دقيقة", code: "AUTH_RATE_LIMIT" },
  keyGenerator: (req) => `${req.ip}${req.body?.email || ""}`
});

/** Slow down قبل الـ block */
export const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: (hits) => hits * 500
});

/** منع account enumeration — نفس الـ response للـ valid/invalid */
export function uniformAuthResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode === 404 && req.path.includes("/auth/")) {
      res.statusCode = 401;
      return originalJson({ success: false, error: "البريد أو كلمة المرور غير صحيحة" });
    }
    return originalJson(body);
  };
  next();
}

// ─────────────────────────────────────────
// A08 — Software & Data Integrity
// ─────────────────────────────────────────

/** التحقق من وجود Paymob HMAC قبل المعالجة */
export function verifyPaymobHMAC(req, res, next) {
  const receivedHmac = req.query?.hmac || req.body?.hmac;
  if (!receivedHmac) {
    return res.status(401).json({ success: false, error: "HMAC مفقود", code: "MISSING_HMAC" });
  }

  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  if (!hmacSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[security] PAYMOB_HMAC_SECRET not set");
      return res.status(500).json({ success: false, error: "Server misconfiguration" });
    }
    return next();
  }

  next();
}

// ─────────────────────────────────────────
// A09 — Logging & Monitoring — NIST AU-2
// ─────────────────────────────────────────

/** Security event logger */
export function securityLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
      console.warn(
        `[SECURITY] ${method} ${originalUrl} ${statusCode} ${duration}ms — IP: ${ip} — User: ${req.user?.id || "anon"}`
      );
    }

    if (duration > 5000) {
      console.warn(`[PERF] Slow request: ${method} ${originalUrl} ${duration}ms`);
    }
  });

  next();
}

// ─────────────────────────────────────────
// A10 — SSRF (Server-Side Request Forgery)
// ─────────────────────────────────────────

const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^::1$/,
  /^fd[0-9a-f]{2}:/i,
  /metadata\.google\.internal/i,
  /169\.254\.169\.254/
];

export function blockSSRF(req, res, next) {
  const urlFields = ["url", "redirect", "callback", "webhook", "image_url", "avatar_url"];
  const body = req.body || {};

  for (const field of urlFields) {
    const value = body[field];
    if (!value) continue;

    try {
      const parsed = new URL(value);
      const hostname = parsed.hostname;

      if (BLOCKED_HOSTS.some((pattern) => pattern.test(hostname))) {
        return res.status(400).json({
          success: false,
          error: "عنوان URL غير مسموح",
          code: "SSRF_BLOCKED"
        });
      }
    } catch {
      // Invalid URL — ignore
    }
  }
  next();
}

// ─────────────────────────────────────────
// CWE-20 — Input Validation
// ─────────────────────────────────────────

/** تحديد حجم الـ request body الافتراضي */
export const bodySizeLimit = "10kb";

/** منع تكرار الـ query params (HPP) */
export const hppProtection = hpp({
  whitelist: ["sort", "filter", "page", "limit", "status"]
});

/** تحديد طول الـ strings */
export function validateInputLengths(req, res, next) {
  const MAX_LENGTHS = {
    email: 254,
    password: 128,
    full_name: 100,
    title: 200,
    description: 5000,
    message: 2000,
    code: 50,
    phone: 20
  };

  const check = (obj) => {
    if (!obj) return null;
    for (const [key, maxLen] of Object.entries(MAX_LENGTHS)) {
      if (obj[key] && typeof obj[key] === "string" && obj[key].length > maxLen) {
        return `${key} يتجاوز الحد المسموح (${maxLen} حرف)`;
      }
    }
    return null;
  };

  const validationError = check(req.body) || check(req.query);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError, code: "INPUT_TOO_LONG" });
  }
  next();
}

// ─────────────────────────────────────────
// NIST AC-3 — Role Enforcement
// ─────────────────────────────────────────

/** تأكد من الـ role بشكل صارم */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "غير مصادق", code: "UNAUTHENTICATED" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "ليس لديك صلاحية للوصول",
        code: "INSUFFICIENT_ROLE",
        required: roles,
        current: req.user.role
      });
    }
    next();
  };
}

export default {
  blockPathTraversal,
  selfOnly,
  enforceHttps,
  sanitizeLogging,
  sanitizeInput,
  blockSQLInjection,
  validateUUID,
  securityHeaders,
  sanitizeErrors,
  authLimiter,
  authSlowDown,
  uniformAuthResponse,
  verifyPaymobHMAC,
  securityLogger,
  blockSSRF,
  bodySizeLimit,
  hppProtection,
  validateInputLengths,
  requireRole
};
