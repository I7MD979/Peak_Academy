/**
 * Idempotency Middleware
 * Standard: OWASP A04 (Insecure Design) | PCI DSS 6.4 | CWE-367
 */

import { createHash } from "crypto";
import { redis } from "../lib/cache.js";

const IDEMPOTENCY_TTL = 60 * 60 * 24;
const KEY_PREFIX = "idempotency:";
const MAX_KEY_LENGTH = 128;
const REDIS_OP_TIMEOUT_MS = 2500;

function withTimeout(promise, ms = REDIS_OP_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("redis_timeout")), ms))
  ]);
}

export function idempotency({ required = false } = {}) {
  return async (req, res, next) => {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();

    const key = req.headers["x-idempotency-key"];

    if (!key) {
      if (required) {
        return res.status(400).json({
          success: false,
          error: "X-Idempotency-Key header مطلوب لهذا الطلب",
          code: "MISSING_IDEMPOTENCY_KEY"
        });
      }
      return next();
    }

    if (typeof key !== "string" || key.length > MAX_KEY_LENGTH || !/^[\w\-.]+$/.test(key)) {
      return res.status(400).json({
        success: false,
        error: "X-Idempotency-Key غير صالح",
        code: "INVALID_IDEMPOTENCY_KEY"
      });
    }

    const userId = req.user?.id || "anon";
    const redisKey = `${KEY_PREFIX}${userId}:${key}`;

    try {
      const cached = await withTimeout(redis.get(redisKey));

      if (cached) {
        const { statusCode, body } = JSON.parse(cached);
        res.setHeader("X-Idempotency-Replayed", "true");
        return res.status(statusCode).json(body);
      }

      const inFlight = await withTimeout(redis.set(`${redisKey}:lock`, "1", "EX", 30, "NX"));

      if (!inFlight) {
        return res.status(409).json({
          success: false,
          error: "طلب مماثل قيد التنفيذ، يرجى الانتظار",
          code: "CONCURRENT_REQUEST"
        });
      }

      const originalJson = res.json.bind(res);
      res.json = function (body) {
        const result = originalJson(body);

        setImmediate(async () => {
          try {
            if (res.statusCode < 500) {
              await withTimeout(
                redis.setex(redisKey, IDEMPOTENCY_TTL, JSON.stringify({ statusCode: res.statusCode, body }))
              );
            }
            await withTimeout(redis.del(`${redisKey}:lock`));
          } catch {
            try {
              await redis.del(`${redisKey}:lock`);
            } catch {
              /* best effort */
            }
          }
        });

        return result;
      };

      req.idempotencyKey = key;
      next();
    } catch (err) {
      console.error("[idempotency] Redis error:", err.message);
      next();
    }
  };
}

export function generateIdempotencyKey(userId, endpoint, amount) {
  const raw = `${userId}:${endpoint}:${amount}:${Date.now()}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 64);
}
