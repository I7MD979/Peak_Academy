/**
 * Sanitize post-login redirect paths from query params (open redirect guard).
 */
export function sanitizeRedirectPath(path, fallback = null) {
  if (!path || typeof path !== "string") return fallback;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  const blocked = ["/auth/login", "/auth/register", "/auth/callback", "/auth/forgot-password"];
  if (blocked.some((p) => trimmed === p || trimmed.startsWith(`${p}/`) || trimmed.startsWith(`${p}?`))) {
    return fallback;
  }
  return trimmed;
}
