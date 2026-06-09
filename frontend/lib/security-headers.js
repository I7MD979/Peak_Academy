const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const API_UPSTREAM =
  process.env.API_UPSTREAM_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://peakacademy-production.up.railway.app";

function supabaseOrigin() {
  try {
    return SUPABASE_URL ? new URL(SUPABASE_URL).origin : "";
  } catch {
    return "";
  }
}

function apiOrigin() {
  try {
    return API_UPSTREAM ? new URL(API_UPSTREAM).origin : "";
  } catch {
    return "";
  }
}

/** Build CSP allowing Next.js, Supabase, Paymob, LiveKit, and Sentry. */
export function buildContentSecurityPolicy() {
  const supabase = supabaseOrigin();
  const api = apiOrigin();
  const connect = [
    "'self'",
    supabase,
    supabase ? supabase.replace("https://", "wss://") : "",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://*.livekit.cloud",
    "wss://*.livekit.cloud",
    api,
    "https://*.sentry.io",
    "https://accept.paymob.com",
    "https://*.paymob.com"
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connect}`,
    "frame-src 'self' https://accept.paymob.com https://*.paymob.com",
    "upgrade-insecure-requests"
  ].join("; ");
}

const BASE_SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()"
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
];

export function headersForPath(pathname = "/") {
  const csp = buildContentSecurityPolicy();
  const headers = [
    ...BASE_SECURITY_HEADERS,
    { key: "Content-Security-Policy", value: csp }
  ];

  const isAuth =
    pathname.startsWith("/auth/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/");

  if (isAuth) {
    headers.push({
      key: "Cache-Control",
      value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    });
    headers.push({ key: "Pragma", value: "no-cache" });
  }

  return headers;
}

/** Apply security headers onto a NextResponse (proxy / middleware). */
export function applySecurityHeaders(response, pathname = "/") {
  for (const { key, value } of headersForPath(pathname)) {
    response.headers.set(key, value);
  }
  return response;
}

export const SENSITIVE_QUERY_KEYS = new Set([
  "password",
  "confirmpassword",
  "confirm_password",
  "email",
  "token",
  "access_token",
  "refresh_token",
  "apikey",
  "api_key"
]);
