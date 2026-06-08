/**
 * Response Integrity Middleware
 * Standard: OWASP A08 | NIST SI-7 | CWE-345
 */

import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_SECRET = process.env.RESPONSE_SIGNING_SECRET || process.env.SUPABASE_SERVICE_KEY;

const SIGNED_ROUTES = [
  "/api/payments",
  "/api/subscriptions",
  "/api/auth/me",
  "/api/earnings",
  "/api/admin"
];

function shouldSign(path) {
  return SIGNED_ROUTES.some((r) => path.startsWith(r));
}

export function signResponses(req, res, next) {
  const path = req.originalUrl?.split("?")[0] || "";
  if (!shouldSign(path) || !SIGNATURE_SECRET) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    try {
      const timestamp = new Date().toISOString();
      const requestId = req.requestId || "";
      const bodyStr = JSON.stringify(body);

      const payload = `${timestamp}:${requestId}:${bodyStr}`;
      const signature = createHmac("sha256", SIGNATURE_SECRET).update(payload).digest("hex");

      res.setHeader("X-Response-Signature", signature);
      res.setHeader("X-Response-Timestamp", timestamp);
      res.setHeader("X-Response-Nonce", requestId);
    } catch {
      /* Signing failure must not break response */
    }
    return originalJson(body);
  };

  next();
}

export function responseEnvelope(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (body && typeof body === "object" && !Array.isArray(body)) {
      body._meta = {
        requestId: req.requestId || null,
        apiVersion: res.getHeader("X-Peak-Api-Version") || null,
        timestamp: new Date().toISOString()
      };
    }
    return originalJson(body);
  };
  next();
}

export function verifyResponseSignature(body, signature, timestamp, nonce) {
  if (!SIGNATURE_SECRET || !signature) return false;

  const age = Date.now() - new Date(timestamp).getTime();
  if (age > 5 * 60 * 1000) return false;

  const payload = `${timestamp}:${nonce}:${body}`;
  const expected = createHmac("sha256", SIGNATURE_SECRET).update(payload).digest("hex");

  try {
    const bufA = Buffer.from(signature, "hex");
    const bufB = Buffer.from(expected, "hex");
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
