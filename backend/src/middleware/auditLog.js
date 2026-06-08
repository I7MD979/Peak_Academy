/**
 * Audit Log Middleware
 * Standard: NIST SP 800-53 AU-2/AU-9/AU-12 | ISO 27001 A.12.4 | GDPR Art.30
 */

import { supabase } from "../lib/supabase.js";

const AUDIT_EXCLUDED_PATHS = [
  "/api/health",
  "/api/diag",
  "/api/notifications/stream",
  "/api/payments/webhook",
  "/payments/webhook",
  "/api/webhooks/"
];

const SENSITIVE_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/payments",
  "/subscriptions",
  "/admin",
  "/earnings",
  "/withdrawal"
];

function isSensitive(path) {
  return SENSITIVE_ROUTES.some((r) => path.includes(r));
}

function sanitizeForAudit(obj) {
  if (!obj || typeof obj !== "object") return undefined;
  const REDACTED_KEYS = ["password", "token", "secret", "key", "cvv", "pin", "authorization", "card_number"];
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = REDACTED_KEYS.some((r) => k.toLowerCase().includes(r)) ? "[REDACTED]" : v;
  }
  return result;
}

function extractEntity(path) {
  const segments = path.split("/").filter(Boolean);
  const entityMap = {
    payments: "payment",
    sessions: "session",
    enrollments: "enrollment",
    subscriptions: "subscription",
    users: "user",
    admin: "admin_action",
    earnings: "earning",
    teacher: "teacher",
    student: "student",
    parent: "parent",
    promotions: "promotion",
    questions: "question",
    notifications: "notification"
  };
  for (const seg of segments) {
    if (entityMap[seg]) return entityMap[seg];
  }
  return "unknown";
}

export function auditLog(req, res, next) {
  const method = req.method;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return next();

  const path = req.originalUrl?.split("?")[0] || "";
  if (AUDIT_EXCLUDED_PATHS.some((p) => path.startsWith(p))) return next();

  const startedAt = Date.now();
  let responseStatus = null;

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    responseStatus = res.statusCode;

    setImmediate(async () => {
      try {
        const duration = Date.now() - startedAt;
        await supabase.from("audit_logs").insert({
          request_id: req.requestId || null,
          actor_id: req.user?.id || null,
          actor_role: req.user?.role || "anonymous",
          action: `${method} ${path}`,
          entity_type: extractEntity(path),
          entity_id: req.params?.id || req.params?.sessionId || null,
          status_code: responseStatus,
          ip_address: req.ip || req.headers["x-forwarded-for"],
          user_agent: req.headers["user-agent"]?.slice(0, 200),
          request_body: sanitizeForAudit(req.body),
          duration_ms: duration,
          is_sensitive: isSensitive(path),
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error("[audit] Failed to write log:", err.message);
      }
    });

    return originalJson(body);
  };

  next();
}

export async function writeAuditLog({
  actorId,
  actorRole,
  action,
  entityType,
  entityId,
  metadata = {},
  requestId = null,
  ipAddress = null
}) {
  try {
    await supabase.from("audit_logs").insert({
      request_id: requestId,
      actor_id: actorId,
      actor_role: actorRole || "system",
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata,
      ip_address: ipAddress,
      is_sensitive: true,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("[audit] writeAuditLog failed:", err.message);
  }
}
