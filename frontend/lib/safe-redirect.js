/**
 * Sanitize post-login redirect paths from query params (open redirect guard).
 */
export function sanitizeRedirectPath(path, fallback = null) {
  if (!path || typeof path !== "string") return fallback;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.startsWith("/auth/login") || trimmed.startsWith("/auth/callback")) {
    return fallback;
  }
  return trimmed;
}
