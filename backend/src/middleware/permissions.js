/**
 * Function-Level Authorization (Permissions Matrix)
 * OWASP API5:2023 — Broken Function Level Authorization
 */

const PERMISSIONS_MATRIX = {
  "GET /api/auth/me": ["*"],
  "PUT /api/auth/profile": ["*"],
  "POST /api/auth/avatar": ["*"],
  "POST /api/auth/setup-profile": ["*"],
  "POST /api/auth/complete-profile": ["*"],

  "GET /api/sessions": ["teacher", "admin"],
  "POST /api/sessions": ["teacher"],
  "GET /api/sessions/:id": ["teacher", "admin", "student", "parent"],
  "POST /api/sessions/:id/start": ["teacher"],
  "POST /api/sessions/:id/end": ["teacher"],
  "POST /api/sessions/:id/enroll": ["student"],
  "POST /api/sessions/:id/join": ["student", "teacher", "admin"],
  "PATCH /api/sessions/:id/cancel": ["teacher", "admin"],
  "POST /api/sessions/close-open": ["teacher", "admin"],
  "POST /api/sessions/purge-daily-rooms": ["teacher", "admin"],
  "POST /api/sessions/:id/mute-all": ["teacher"],

  "POST /api/payments/initiate": ["student"],
  "POST /api/payments/create-order": ["student"],
  "GET /api/payments/availability": ["student"],
  "GET /api/payments/history": ["student", "admin"],
  "GET /api/payments/transactions/:id/status": ["student", "admin"],
  "GET /api/payments/orders/:paymentId/status": ["student", "admin"],
  "POST /api/payments/validate-promo": ["student"],

  "GET /api/subscriptions/plans": ["*"],
  "GET /api/subscriptions/me": ["student"],
  "POST /api/subscriptions/purchase": ["student"],

  "GET /api/admin/stats": ["admin"],
  "GET /api/admin/dashboard": ["admin"],
  "GET /api/admin/users": ["admin"],
  "PUT /api/admin/users/:id/suspend": ["admin"],
  "PUT /api/admin/users/:id/activate": ["admin"],
  "PUT /api/admin/users/:id/verify": ["admin"],
  "GET /api/admin/reports": ["admin"],
  "GET /api/admin/withdrawals": ["admin"],
  "PUT /api/admin/withdrawals/:id": ["admin"],
  "GET /api/admin/plans": ["admin"],
  "POST /api/admin/plans": ["admin"],
  "PUT /api/admin/plans/:id": ["admin"],

  "GET /api/earnings": ["teacher", "admin"],
  "POST /api/earnings/withdraw": ["teacher"],

  "GET /api/parent/children": ["parent", "admin"],
  "GET /api/parent/reports": ["parent", "admin"],

  "GET /api/student/sessions": ["student"],
  "GET /api/student/sessions/:id": ["student"],

  "GET /api/teacher/profile": ["teacher", "admin"],
  "PUT /api/teacher/profile": ["teacher"],

  // Verification review — granular gate via requirePermission("verification.review");
  // Supervisors pass this BFLA check but still need the explicit permission assigned.
  "GET /api/admin/verification-documents": ["admin", "supervisor"],
  "GET /api/admin/verification-documents/:id/signed-url": ["admin", "supervisor"],
  "POST /api/admin/verification-documents/:id/approve": ["admin", "supervisor"],
  "POST /api/admin/verification-documents/:id/reject": ["admin", "supervisor"]
};

function matchesPattern(pattern, key) {
  const regexStr = pattern
    .replace(/:[^/]+/g, "[^/]+")
    .replace(/\//g, "\\/")
    .replace(/\*/g, ".*");
  return new RegExp(`^${regexStr}$`).test(key);
}

function isAllowed(method, path, role) {
  const key = `${method} ${path}`;

  if (PERMISSIONS_MATRIX[key]) {
    const allowed = PERMISSIONS_MATRIX[key];
    return allowed.includes("*") || allowed.includes(role);
  }

  for (const [pattern, roles] of Object.entries(PERMISSIONS_MATRIX)) {
    if (matchesPattern(pattern, key)) {
      return roles.includes("*") || roles.includes(role);
    }
  }

  if (path.startsWith("/api/admin")) {
    return role === "admin" || role === "supervisor";
  }

  return true;
}

export function checkPermission(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "غير مصادق", code: "UNAUTHENTICATED" });
  }

  const path = req.originalUrl.split("?")[0];
  const method = req.method;

  if (!isAllowed(method, path, req.user.role)) {
    console.warn(`[permissions] BFLA attempt: ${method} ${path} by role=${req.user.role} user=${req.user.id}`);
    return res.status(403).json({
      success: false,
      error: "ليس لديك صلاحية لهذا الإجراء",
      code: "FORBIDDEN"
    });
  }

  next();
}

export function getRolePermissions(role) {
  return Object.entries(PERMISSIONS_MATRIX)
    .filter(([, roles]) => roles.includes(role) || roles.includes("*"))
    .map(([endpoint]) => endpoint);
}

/**
 * Granular admin-panel permissions (stored per-supervisor in admin_permissions).
 * Admins implicitly hold all permissions via requirePermission middleware.
 */
export const ADMIN_GRANULAR_PERMISSIONS = [
  "dashboard",
  "users.read",
  "users.edit",
  "users.delete",
  "users.subscriptions",
  "sessions.read",
  "withdrawals.read",
  "withdrawals.write",
  "reports",
  "plans.read",
  "plans.create",
  "plans.edit",
  "plans.delete",
  "promotions.read",
  "promotions.create",
  "promotions.edit",
  "promotions.delete",
  "landing",
  "verification.review"
];

/**
 * Permissions never granted to new supervisors by default — assign manually by admin only.
 * admin_permissions defaults to '{}' for new supervisor accounts (see 20260626_staff_permissions.sql).
 */
export const SUPERVISOR_RESTRICTED_PERMISSIONS = new Set(["verification.review"]);

export { PERMISSIONS_MATRIX };
