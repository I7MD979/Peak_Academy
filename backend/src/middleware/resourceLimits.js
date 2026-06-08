/**
 * Resource Consumption Limits
 * OWASP API4:2023 — Unrestricted Resource Consumption
 */

import { rateLimit } from "express-rate-limit";

const disabled =
  process.env.DISABLE_RATE_LIMIT === "true" || process.env.DISABLE_RATE_LIMIT === "1";

function limiterOpts({ windowMs, max, message, code, skip }) {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => `${req.ip}:${req.user?.id || "anon"}`,
    message: { success: false, error: message, code },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => disabled || skip?.(req) || process.env.NODE_ENV !== "production"
  });
}

export const paymentLimiter = limiterOpts({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "تجاوزت الحد المسموح لمحاولات الدفع",
  code: "PAYMENT_RATE_LIMIT"
});

export const enrollmentLimiter = limiterOpts({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "محاولات تسجيل كثيرة جداً",
  code: "ENROLLMENT_RATE_LIMIT"
});

export const listLimiter = limiterOpts({
  windowMs: 60 * 1000,
  max: 60,
  message: "طلبات كثيرة — انتظر قليلاً",
  code: "LIST_RATE_LIMIT",
  skip: (req) => req.user?.role === "admin"
});

export const adminQueryLimiter = limiterOpts({
  windowMs: 60 * 1000,
  max: 30,
  message: "طلبات إدارية كثيرة",
  code: "ADMIN_RATE_LIMIT"
});

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

export function enforcePagination(req, _res, next) {
  const rawPage = parseInt(req.query.page, 10) || 1;
  const rawLimit = parseInt(req.query.limit, 10) || DEFAULT_PAGE_LIMIT;

  const page = Math.max(1, rawPage);
  const limit = Math.min(Math.max(1, rawLimit), MAX_PAGE_LIMIT);

  if (rawLimit > MAX_PAGE_LIMIT) {
    req.query.limit = String(MAX_PAGE_LIMIT);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  req.pagination = { page, limit, from, to };
  next();
}

export function trackRequestCost(cost = 1) {
  return (req, _res, next) => {
    req.requestCost = (req.requestCost || 0) + cost;
    next();
  };
}

export function limitArrayFields(limits = {}) {
  return (req, res, next) => {
    for (const [field, maxLen] of Object.entries(limits)) {
      if (Array.isArray(req.body?.[field]) && req.body[field].length > maxLen) {
        return res.status(400).json({
          success: false,
          error: `الحد الأقصى لـ ${field} هو ${maxLen} عنصر`,
          code: "ARRAY_TOO_LARGE"
        });
      }
    }
    next();
  };
}
