/**
 * Peak Academy — k6 load test
 *
 * Scenarios:
 *  1. browsing  — public landing page + public API (no auth)
 *  2. login     — Supabase password grant + authenticated backend APIs
 *
 * Auth note: Peak Academy does NOT expose POST /api/auth/login.
 * Login uses Supabase Auth (signInWithPassword) → JWT access_token in response body.
 * Backend APIs expect: Authorization: Bearer <access_token>
 *
 * Run:
 *   k6 run peak-load-test.js
 *
 * Override targets (recommended for staging / local):
 *   k6 run -e BASE_URL=https://peak-academy.net \
 *          -e API_URL=https://peak-academy.net/peak-api \
 *          -e SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
 *          -e SUPABASE_ANON_KEY=your_anon_key \
 *          -e K6_TARGET_VUS=150 \
 *          peak-load-test.js
 *
 * VU scaling: K6_TARGET_VUS = combined peak (80% browsing + 20% login).
 * Default 500 when unset (local stress profile). GitHub Actions passes 100–300 via workflow_dispatch.
 */
import http from "k6/http";
import { check, group, sleep } from "k6";
import { SharedArray } from "k6/data";
import exec from "k6/execution";

const TARGET_VUS = Math.max(1, parseInt(__ENV.K6_TARGET_VUS || "500", 10));
const BROWSING_PEAK = Math.round(TARGET_VUS * 0.8);
const LOGIN_PEAK = TARGET_VUS - BROWSING_PEAK;

function browsingStages(peak) {
  return [
    { duration: "2m", target: Math.max(1, Math.round(peak * 0.25)) },
    { duration: "3m", target: Math.max(1, Math.round(peak * 0.625)) },
    { duration: "3m", target: peak },
    { duration: "2m", target: 0 }
  ];
}

function loginStages(peak) {
  if (peak <= 0) {
    return [{ duration: "1s", target: 0 }];
  }
  return [
    { duration: "2m", target: Math.max(1, Math.round(peak * 0.3)) },
    { duration: "4m", target: peak },
    { duration: "2m", target: 0 }
  ];
}

// ── Targets (match production topology) ──────────────────────────────────────
// Frontend: peak-academy.net (Vercel)
// Backend API: Railway, proxied on production via /peak-api rewrite
const BASE_URL = (__ENV.BASE_URL || "https://peak-academy.net").replace(/\/$/, "");
const API_URL = (__ENV.API_URL || `${BASE_URL}/peak-api`).replace(/\/$/, "");
const SUPABASE_URL = (__ENV.SUPABASE_URL || "https://hpczrdvaeazrrrzgtatl.supabase.co").replace(/\/$/, "");
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || "";

// ── Routes (verified against codebase) ───────────────────────────────────────
const ROUTES = {
  landingPage: "/",
  loginPage: "/auth/login",
  studentDashboardPage: "/student/dashboard",
  publicLandingApi: "/public/landing",
  healthApi: "/health",
  authMeApi: "/auth/me",
  studentDashboardApi: "/student/dashboard"
};

const TEST_USERS = new SharedArray("loadtest-users", () =>
  Array.from({ length: 15 }, (_, i) => ({
    email: `loadtest${i + 1}@test.com`,
    password: "TestPass123!"
  }))
);

export const options = {
  scenarios: {
    browsing: {
      executor: "ramping-vus",
      exec: "browsingFlow",
      startVUs: 0,
      stages: browsingStages(BROWSING_PEAK),
      gracefulRampDown: "30s"
    },
    login: {
      executor: "ramping-vus",
      exec: "loginFlow",
      startVUs: 0,
      stages: loginStages(LOGIN_PEAK),
      gracefulRampDown: "30s"
    }
  },
  maxDuration: "12m",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"],
    "checks{flow:browsing}": ["rate>0.95"],
    "checks{flow:login}": ["rate>0.90"]
  }
};

function jsonHeaders(extra = {}) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra
  };
}

function supabaseHeaders() {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY is required for loginFlow — pass via -e SUPABASE_ANON_KEY=...");
  }
  return {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json"
  };
}

/**
 * Supabase GoTrue password grant (same as frontend supabase.auth.signInWithPassword).
 * Returns access_token string or null.
 */
function supabaseLogin(email, password) {
  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    { headers: supabaseHeaders(), tags: { name: "SupabaseLogin" } }
  );

  const ok = check(
    res,
    {
      "supabase login status 200": (r) => r.status === 200
    },
    { flow: "login" }
  );

  if (!ok) return null;

  try {
    const body = res.json();
    return body.access_token || null;
  } catch {
    return null;
  }
}

export function browsingFlow() {
  group("Public browsing", () => {
    const landing = http.get(`${BASE_URL}${ROUTES.landingPage}`, {
      tags: { name: "GET /" }
    });
    check(
      landing,
      {
        "landing page 200": (r) => r.status === 200
      },
      { flow: "browsing" }
    );

    const landingApi = http.get(`${API_URL}${ROUTES.publicLandingApi}`, {
      headers: jsonHeaders(),
      tags: { name: "GET /public/landing" }
    });
    check(
      landingApi,
      {
        "public landing API 200": (r) => r.status === 200,
        "public landing success flag": (r) => {
          try {
            return r.json("success") === true;
          } catch {
            return false;
          }
        }
      },
      { flow: "browsing" }
    );

    const health = http.get(`${API_URL}${ROUTES.healthApi}`, {
      headers: jsonHeaders(),
      tags: { name: "GET /health" }
    });
    check(
      health,
      {
        "health 200": (r) => r.status === 200
      },
      { flow: "browsing" }
    );

    const loginPage = http.get(`${BASE_URL}${ROUTES.loginPage}`, {
      tags: { name: "GET /auth/login" }
    });
    check(
      loginPage,
      {
        "login page 200": (r) => r.status === 200
      },
      { flow: "browsing" }
    );
  });

  sleep(1 + Math.random());
}

export function loginFlow() {
  const user = TEST_USERS[exec.vu.idInTest % TEST_USERS.length];

  group("Supabase login + student APIs", () => {
    const token = supabaseLogin(user.email, user.password);
    check(token, { "received access_token": (t) => typeof t === "string" && t.length > 20 }, { flow: "login" });

    if (!token) {
      sleep(1);
      return;
    }

    const authHeaders = jsonHeaders({ Authorization: `Bearer ${token}` });

    const me = http.get(`${API_URL}${ROUTES.authMeApi}`, {
      headers: authHeaders,
      tags: { name: "GET /auth/me" }
    });
    check(
      me,
      {
        "auth/me 200": (r) => r.status === 200,
        "auth/me student role": (r) => {
          try {
            return r.json("data.role") === "student";
          } catch {
            return false;
          }
        }
      },
      { flow: "login" }
    );

    const dashboardApi = http.get(`${API_URL}${ROUTES.studentDashboardApi}`, {
      headers: authHeaders,
      tags: { name: "GET /student/dashboard" }
    });
    check(
      dashboardApi,
      {
        "student dashboard API 200": (r) => r.status === 200,
        "student dashboard success": (r) => {
          try {
            return r.json("success") === true;
          } catch {
            return false;
          }
        }
      },
      { flow: "login" }
    );

    // HTML dashboard route (SSR — may redirect to login without Supabase cookies; informational only)
    http.get(`${BASE_URL}${ROUTES.studentDashboardPage}`, {
      tags: { name: "GET /student/dashboard (page)" },
      redirects: 5
    });
  });

  sleep(1.5 + Math.random());
}

export function setup() {
  if (!SUPABASE_ANON_KEY) {
    console.warn(
      "WARNING: SUPABASE_ANON_KEY not set — loginFlow will fail. " +
        "Export NEXT_PUBLIC_SUPABASE_ANON_KEY or pass -e SUPABASE_ANON_KEY=..."
    );
  }
  console.info(
    `Load profile: K6_TARGET_VUS=${TARGET_VUS} → browsing peak ${BROWSING_PEAK}, login peak ${LOGIN_PEAK}`
  );
  return {
    baseUrl: BASE_URL,
    apiUrl: API_URL,
    targetVus: TARGET_VUS,
    browsingPeak: BROWSING_PEAK,
    loginPeak: LOGIN_PEAK
  };
}
