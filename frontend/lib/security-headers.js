const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const API_UPSTREAM =
  process.env.API_UPSTREAM_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://peakacademy-production.up.railway.app";

const PAYMOB_ORIGINS = [
  "https://accept.paymob.com",
  "https://accept.paymobsolutions.com"
];

function originFromUrl(url) {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function supabaseOrigin() {
  return originFromUrl(SUPABASE_URL);
}

function apiOrigin() {
  return originFromUrl(API_UPSTREAM);
}

function sentryIngestOrigin() {
  return originFromUrl(process.env.NEXT_PUBLIC_SENTRY_DSN || "");
}

function livekitOrigins() {
  const configured = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();
  if (configured) {
    const origin = originFromUrl(configured);
    if (origin) {
      return {
        https: origin,
        wss: origin.replace("https://", "wss://")
      };
    }
  }
  return {
    https: "https://*.livekit.cloud",
    wss: "wss://*.livekit.cloud"
  };
}

/** Nonce-based CSP for HTML responses (set via proxy). */
export function buildContentSecurityPolicy(nonce) {
  const isProd = process.env.NODE_ENV === "production";
  const supabase = supabaseOrigin();
  const api = apiOrigin();
  const sentry = sentryIngestOrigin();
  const livekit = livekitOrigins();

  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (!isProd) {
    scriptSrc.push("'unsafe-eval'");
  }
  if (sentry) {
    scriptSrc.push(sentry);
  }

  const connectSrc = [
    "'self'",
    supabase,
    supabase ? supabase.replace("https://", "wss://") : "",
    api,
    sentry,
    livekit.https,
    livekit.wss,
    ...PAYMOB_ORIGINS
  ].filter(Boolean);

  const imgSrc = ["'self'", "data:", "blob:"];
  if (supabase) {
    imgSrc.push(supabase);
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src ${imgSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    `frame-src 'self' ${PAYMOB_ORIGINS.join(" ")}`
  ];

  if (isProd) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
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

function cacheHeadersForPath(pathname = "/") {
  const isAuth =
    pathname.startsWith("/auth/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/");

  if (!isAuth) return [];

  return [
    {
      key: "Cache-Control",
      value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    },
    { key: "Pragma", value: "no-cache" }
  ];
}

/** Headers for next.config (no per-request nonce). CSP is applied in proxy. */
export function baseHeadersForPath(pathname = "/") {
  return [...BASE_SECURITY_HEADERS, ...cacheHeadersForPath(pathname)];
}

/** @deprecated Use baseHeadersForPath in next.config; CSP via applySecurityHeaders in proxy. */
export function headersForPath(pathname = "/") {
  return baseHeadersForPath(pathname);
}

export const CSRF_COOKIE_NAME = "csrf_token";

export function ensureCsrfCookie(request, response) {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (existing) return existing;

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    maxAge: 60 * 60 * 8
  });
  return token;
}

/** Apply security headers onto a NextResponse (proxy). */
export function applySecurityHeaders(response, pathname = "/", nonce = "") {
  for (const { key, value } of BASE_SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  for (const { key, value } of cacheHeadersForPath(pathname)) {
    response.headers.set(key, value);
  }
  if (nonce) {
    response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  }
  return response;
}

export function createRequestSecurityContext(request) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  return { nonce, requestHeaders };
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
