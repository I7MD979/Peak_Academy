import { supabase } from "../lib/supabase.js";

// Short-lived in-memory cache so we don't hit DB on every request
const _cache = new Map();
const CACHE_TTL = 60_000; // 1 min

async function loadSupervisorPermissions(userId) {
  const hit = _cache.get(userId);
  if (hit && Date.now() < hit.exp) return hit.perms;

  const { data } = await supabase
    .from("admin_permissions")
    .select("permissions")
    .eq("user_id", userId)
    .maybeSingle();

  const perms = data?.permissions || [];
  _cache.set(userId, { perms, exp: Date.now() + CACHE_TTL });
  return perms;
}

/** Call this after changing a supervisor's permissions to bust the cache. */
export function invalidatePermissionCache(userId) {
  _cache.delete(userId);
}

/**
 * Route gate: admins always pass, supervisors pass only if they hold `permission`.
 * Drop-in replacement for checkRole("admin") on supervisor-accessible routes.
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
    }

    if (user.role === "admin") return next();

    if (user.role === "supervisor") {
      try {
        const perms = await loadSupervisorPermissions(user.id);
        if (perms.includes(permission) || perms.includes("admin.all")) return next();
      } catch {
        /* fall through to 403 */
      }
    }

    return res.status(403).json({
      success: false,
      error: "غير مصرح لك بهذا الإجراء",
      code: "INSUFFICIENT_PERMISSIONS"
    });
  };
}

/** Passes if user is admin OR supervisor (any permissions). Use for /me/permissions route. */
export function checkAdminOrSupervisor(req, res, next) {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
  if (role !== "admin" && role !== "supervisor") {
    return res.status(403).json({ success: false, error: "غير مصرح لك بهذا الإجراء" });
  }
  next();
}
