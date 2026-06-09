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

  const styleSrc = isProd
    ? ["'self'", `'nonce-${nonce}'`]
    : ["'self'", `'nonce-${nonce}'`, "'unsafe-inline'"];

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
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

const HSTS_VALUE = "max-age=63072000; includeSubDomains; preload";

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

function isSeoMetadataPath(pathname = "/") {
  return pathname === "/robots.txt" || pathname === "/sitemap.xml";
}

function cacheHeadersForPath(pathname = "/") {
  const isAuth =
    pathname.startsWith("/auth/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/");

  if (isAuth) {
    return [
      {
        key: "Cache-Control",
        value: "private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
      },
      { key: "Pragma", value: "no-cache" }
    ];
  }

  if (pathname === "/") {
    return [
      {
        key: "Cache-Control",
        value: "private, no-cache, must-revalidate, max-age=0"
      }
    ];
  }

  return [];
}

function productionSecurityHeaders(pathname = "/") {
  if (process.env.NODE_ENV !== "production") return [];

  const headers = [{ key: "Strict-Transport-Security", value: HSTS_VALUE }];
  if (isSeoMetadataPath(pathname)) {
    headers.push({ key: "Content-Security-Policy", value: buildStaticAssetCsp() });
  }
  return headers;
}

/** Headers for next.config (no per-request nonce). CSP is applied in proxy. */
export function baseHeadersForPath(pathname = "/") {
  return [...BASE_SECURITY_HEADERS, ...productionSecurityHeaders(pathname), ...cacheHeadersForPath(pathname)];
}

/** @deprecated Use baseHeadersForPath in next.config; CSP via applySecurityHeaders in proxy. */
export function headersForPath(pathname = "/") {
  return baseHeadersForPath(pathname);
}

export const CSRF_COOKIE_NAME = "csrf_token";

function generateCsrfToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function shouldIssueCsrfCookie(pathname = "/") {
  return pathname.startsWith("/auth/") || pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

export function issueCsrfCookie(response, request, pathname, csrfToken) {
  if (!shouldIssueCsrfCookie(pathname)) return;
  if (request.cookies.get(CSRF_COOKIE_NAME)?.value) return;

  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 8
  });
}

/** Minimal CSP for static/binary responses (satisfies scanners on asset URLs). */
export function buildStaticAssetCsp() {
  return "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
}

/** Apply security headers onto a NextResponse (proxy). */
export function applySecurityHeaders(response, pathname = "/", nonce = "") {
  for (const { key, value } of BASE_SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  for (const { key, value } of productionSecurityHeaders(pathname)) {
    response.headers.set(key, value);
  }
  for (const { key, value } of cacheHeadersForPath(pathname)) {
    response.headers.set(key, value);
  }
  if (isSeoMetadataPath(pathname)) {
    response.headers.set("Content-Security-Policy", buildStaticAssetCsp());
  } else if (nonce) {
    response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  }
  return response;
}

export function createRequestSecurityContext(request) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const csrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value || generateCsrfToken();
  requestHeaders.set("x-csrf-token", csrfToken);

  return { nonce, requestHeaders, csrfToken };
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
