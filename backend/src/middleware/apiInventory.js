/**
 * API Inventory Management
 * OWASP API9:2023 — Improper Inventory Management
 */

const CURRENT_API_VERSION = process.env.API_VERSION || "v1";

const DEPRECATED_ENDPOINTS = [
  { path: "/auth/", method: null, replacement: "/api/auth/", sunset: "2026-09-01" }
];

const SENSITIVE_DEBUG_ENDPOINTS = ["/api/diag"];

export function apiVersioning(req, res, next) {
  res.setHeader("X-API-Version", CURRENT_API_VERSION);

  const path = req.originalUrl?.split("?")[0] || "";
  const deprecated = DEPRECATED_ENDPOINTS.find(
    (d) => path.startsWith(d.path) && (!d.method || d.method === req.method)
  );

  if (deprecated) {
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", deprecated.sunset);
    if (deprecated.replacement) {
      res.setHeader("Link", `<${deprecated.replacement}>; rel="successor-version"`);
    }
    console.warn(`[inventory] Deprecated endpoint: ${req.method} ${path} user=${req.user?.id || "anon"}`);
  }

  next();
}

export function protectDebugEndpoints(req, res, next) {
  const path = req.originalUrl?.split("?")[0] || "";

  if (SENSITIVE_DEBUG_ENDPOINTS.some((ep) => path.startsWith(ep))) {
    if (process.env.NODE_ENV === "production") {
      if (!req.user || req.user.role !== "admin") {
        return res.status(404).json({
          success: false,
          error: "المسار غير موجود",
          code: "NOT_FOUND"
        });
      }
      console.warn(`[inventory] Debug endpoint accessed: ${path} admin=${req.user.id} IP=${req.ip}`);
    }
  }

  next();
}

export function createApiManifestHandler(app) {
  return (_req, res) => {
    const routes = [];
    const stack = app._router?.stack || [];
    for (const layer of stack) {
      if (layer.route) {
        routes.push({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods)
        });
      }
    }
    res.json({ success: true, data: { routes, count: routes.length, version: CURRENT_API_VERSION } });
  };
}

export function requireJsonContentType(req, res, next) {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();

  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/")) return next();

  const path = req.originalUrl || "";
  if (path.includes("/webhook") || path.includes("/callback")) return next();

  if (
    req.body &&
    typeof req.body === "object" &&
    Object.keys(req.body).length > 0 &&
    !contentType.includes("application/json")
  ) {
    return res.status(415).json({
      success: false,
      error: "Content-Type يجب أن يكون application/json",
      code: "UNSUPPORTED_MEDIA_TYPE"
    });
  }

  next();
}
