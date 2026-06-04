const LOCAL_API = "http://localhost:4000/api";
const DEFAULT_RAILWAY_API = "https://peakacademy-production.up.railway.app/api";

function stripMisconfiguredBase(url) {
  let base = url.replace(/\/$/, "");
  if (base.endsWith("/api/auth")) base = base.slice(0, -"/api/auth".length);
  if (base.endsWith("/auth")) base = base.slice(0, -"/auth".length);
  return base;
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isPeakFrontendHost(hostname) {
  return (
    hostname === "peak-academy.net" ||
    hostname === "www.peak-academy.net" ||
    hostname.endsWith(".vercel.app")
  );
}

/**
 * Ensures API base URL ends with /api, or uses same-origin /peak-api proxy on production frontend.
 */
export function normalizeApiBaseUrl(raw) {
  const configured = raw?.trim();
  if (configured) {
    const base = stripMisconfiguredBase(configured);
    if (base.endsWith("/api")) return base;
    return `${base}/api`;
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (isLocalHost(hostname)) return LOCAL_API;
    if (isPeakFrontendHost(hostname)) return `${origin}/peak-api`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/peak-api`;
  }

  return LOCAL_API;
}

/** Resolve at request time (not only at module load). */
export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (isPeakFrontendHost(hostname)) {
      return `${origin}/peak-api`;
    }
  }

  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return normalizeApiBaseUrl(configured);

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/peak-api`;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_RAILWAY_API;
  }

  return LOCAL_API;
}
