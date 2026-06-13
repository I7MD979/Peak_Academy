# Peak Academy — Rate Limit Audit (429 Investigation)

**Context:** k6 load test (`peak-load-test.js`) against production (`peak-academy.net` + `/peak-api`) returned widespread **429 Too Many Requests** on backend API routes. This document maps every rate-limit layer in our codebase and classifies which layer likely caused each failure.

**Scope:** Read-only audit — no configuration changes applied.

**Date:** June 2026

---

## Executive summary

| Finding | Detail |
|---------|--------|
| **Primary cause (backend API)** | Global Express limiter: **120 requests / 15 minutes / IP** on **all** `/api/*` and `/auth/*` routes in production |
| **Affected k6 paths** | `/api/public/landing`, `/api/health`, `/api/auth/me`, `/api/student/dashboard` — all share the same 120-request bucket |
| **Login in k6** | Uses **Supabase Auth** (`POST …/auth/v1/token?grant_type=password`), **not** a backend route — 429s there come from **Supabase**, not Express |
| **`/auth/login` in k6 browsing** | Hits the **Next.js HTML page** only — no backend rate limit; returned 200 in the test |
| **Vercel / WAF** | No custom rate-limit rules in repo; platform DDoS/concurrency limits may add 429s under extreme load (not codified here) |
| **Recommendation theme** | Exempt or raise limits for **public read** endpoints (`/health`, `/public/landing`); keep **strict** limits on credential-bearing auth flows; add a **separate, higher** bucket for authenticated read APIs (`/auth/me`, `/student/dashboard`) |

---

## 1. Backend middleware inventory

### 1.1 Global API limiter (main suspect for API 429s)

**File:** `backend/src/middleware/rateLimit.js`  
**Applied in:** `backend/src/app.js` line 186:

```js
app.use(["/api", "/auth"], limiter);
```

| Setting | Value |
|---------|-------|
| `windowMs` | `15 * 60 * 1000` → **15 minutes** |
| `max` | **120** (production) / **10,000** (non-production) |
| `keyGenerator` | **Default** (`express-rate-limit`) → **`req.ip`** (per IP) |
| `standardHeaders` | `true` (sends `RateLimit-*` headers) |
| `skip` | `DISABLE_RATE_LIMIT=true`, non-production, `/payments/webhook`, `/notifications/stream` |
| Error body | `{ success: false, error: "طلبات كثيرة — انتظر قليلًا ثم أعد المحاولة" }` |
| HTTP status | **429** |

**Routes covered:** Every path starting with `/api` or `/auth`, including:

- `GET /api/health`
- `GET /api/public/landing`
- `GET /api/auth/me`
- `GET /api/student/dashboard`
- All other REST routes

**Routes NOT covered:** Frontend pages (`/`, `/auth/login` HTML), Supabase Auth host, static assets.

**k6 impact:** Browsing scenario fires **2 API calls per iteration** (`/public/landing` + `/health`). Login scenario adds **2 more** (`/auth/me` + `/student/dashboard`) when Supabase login succeeds. With up to **25 browsing VUs** for 2 minutes, a single runner IP can generate **hundreds** of API calls — far above **120 / 15 min**.

---

### 1.2 Auth-specific limiter (NOT on `/auth/me`)

**File:** `backend/src/middleware/security.js` — `authLimiter`

| Setting | Value |
|---------|-------|
| `windowMs` | **15 minutes** |
| `max` | **10** |
| `skipSuccessfulRequests` | `true` (only failed attempts count) |
| `keyGenerator` | `` `${req.ip}${req.body?.email \|\| ""}` `` → **IP + email** |
| Message | `"محاولات كثيرة — انتظر 15 دقيقة"`, code `AUTH_RATE_LIMIT` |

**Applied only on these routes** (`backend/src/routes/auth.js`):

| Method | Path | Middleware chain |
|--------|------|------------------|
| `POST` | `/setup-profile` | `authSlowDown`, **`authLimiter`**, … |
| `POST` | `/complete-profile` | `oauthLimiter`, `authSlowDown`, **`authLimiter`**, … |
| `POST` | `/reject-new-account` | `oauthLimiter` only (no authLimiter) |

**NOT applied on:** `GET /auth/me`, `GET /auth/setup-profile`, `POST /auth/avatar`, etc.

**Note:** There is **no** `POST /api/auth/login` in this codebase. Password login is client-side Supabase only.

**Companion:** `authSlowDown` — after **3** requests in 15 min, adds **500ms × hit count** delay (does not return 429 by itself).

---

### 1.3 OAuth limiter

**File:** `backend/src/middleware/oauth-security.js` — `oauthLimiter`

| Setting | Value |
|---------|-------|
| `windowMs` | **10 minutes** |
| `max` | **20** |
| `keyGenerator` | **`req.ip`** |
| Routes | `/api/auth/google/*` (`google-auth.js`) |

Not involved in k6 login flow (k6 uses Supabase password grant).

---

### 1.4 Public promo limiter

**File:** `backend/src/routes/public.js` — `publicPromoLimiter`

| Setting | Value |
|---------|-------|
| `windowMs` | **60 seconds** |
| `max` | **20** |
| `keyGenerator` | **Default → `req.ip`** |
| Route | **`POST /api/public/validate-promo` only** |

**`GET /api/public/landing` is NOT behind this limiter** — only the global 120/15min limiter applies.

---

### 1.5 Resource / business limiters

**File:** `backend/src/middleware/resourceLimits.js`

| Export | windowMs | max | keyGenerator | Typical routes |
|--------|----------|-----|--------------|----------------|
| `paymentLimiter` | 1 hour | 10 | `` `${req.ip}:${req.user?.id \|\| "anon"}` `` | `/api/payments/*`, subscriptions |
| `enrollmentLimiter` | 15 min | 20 | IP + user id | session enroll |
| `listLimiter` | **1 min** | **60** | IP + user id | `GET /api/sessions/` list |
| `adminQueryLimiter` | 1 min | 30 | IP + user id | admin queries |

Production-only (`skip` when `NODE_ENV !== "production"` or `DISABLE_RATE_LIMIT=true`).

**`GET /api/student/dashboard` does NOT use `listLimiter`** — only the global limiter applies.

**File:** `backend/src/middleware/businessRules.js` — `velocityCheck()`  
Redis-backed per-**user** velocity (returns 429 `VELOCITY_EXCEEDED`). Used on sensitive business flows, not on the k6 paths audited here.

---

### 1.6 Paymob webhook limiter

**File:** `backend/src/utils/paymob-security.js` — `webhookLimiter`  
60 req/min, key `"paymob_webhook"` (global single bucket). Not relevant to k6 paths.

---

## 2. Frontend / edge / platform

### 2.1 Next.js (`frontend/next.config.mjs`)

- **`/peak-api/:path*` rewrite** → `API_UPSTREAM_URL` (Railway). No rate limiting in rewrite config.
- Security headers only — no throttle middleware.

### 2.2 Vercel (`frontend/vercel.json`)

- CSP-related **headers** only.
- **No** `rateLimit`, WAF rules, or edge middleware rate config in repo.

### 2.3 Next proxy (`frontend/proxy.js`)

- Auth gating, CSRF cookies, security headers.
- **No** request counting or 429 generation.

### 2.4 Vercel platform (external, not in code)

Under heavy load, Vercel may return 429 due to:

- Serverless / Edge concurrency caps
- DDoS / abuse protection (undocumented per-plan thresholds)

Cannot be tuned from this repository. k6 traffic to `https://peak-academy.net/peak-api/*` passes through Vercel before Railway; client IP forwarding depends on `X-Forwarded-For` + Express `trust proxy` (set to `1` in `app.js`).

---

## 3. Supabase Auth (login flow)

### 3.1 How login works

| Layer | Mechanism |
|-------|-----------|
| Frontend | `supabase.auth.signInWithPassword({ email, password })` — `frontend/hooks/useAuth.js` |
| k6 | `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` with header `apikey: <ANON_KEY>` |
| Backend | **No login endpoint** — validates JWT on protected routes via `Authorization: Bearer` |

### 3.2 Supabase rate limits

Configured in **Supabase Dashboard → Authentication → Rate Limits** (project `hpczrdvaeazrrrzgtatl`). **Not adjustable from Peak Academy application code.**

Frontend handles Supabase 429 via `frontend/lib/auth-errors.js`:

- `error.status === 429`
- codes: `over_request_rate_limit`, `over_email_send_rate_limit`
- message containing `"rate limit"` / `"too many requests"`

**k6 observation:** ~**58%** Supabase login success — consistent with Supabase-side throttling under concurrent password grants from one IP, independent of Express.

Typical Supabase defaults (verify in Dashboard; values vary by plan):

- Sign-in / token endpoint: bounded per IP per time window
- Separate limits for sign-up, email OTP, etc.

---

## 4. Path-by-path analysis (k6 targets)

| Path (as k6 hits it) | Hits which layer? | Rate limit type | Current effective limit | Likely 429 source in k6 |
|----------------------|-------------------|-----------------|-------------------------|-------------------------|
| `GET /` (landing HTML) | Vercel SSR | Platform concurrency / DDoS | Plan-dependent | Unlikely (100% OK in test) |
| `GET /peak-api/public/landing` | Vercel → Railway → **global limiter** | **Our code** | **120 / 15 min / IP** | **Yes — primary** |
| `GET /peak-api/health` | Vercel → Railway → **global limiter** | **Our code** | **120 / 15 min / IP** (same bucket) | **Yes — primary** |
| `GET /auth/login` (HTML) | Vercel | None in code | — | No (100% OK in test) |
| `POST …supabase.co/auth/v1/token` (login) | Supabase GoTrue | **Supabase Dashboard** | Dashboard-configured | **Yes — ~42% failed** |
| `GET /peak-api/auth/me` | Railway → **global limiter** + JWT auth | **Our code** (global only) | **120 / 15 min / IP** (shared) | **Yes** — often after bucket exhausted |
| `GET /peak-api/student/dashboard` | Railway → **global limiter** + JWT + role | **Our code** (global only) | **120 / 15 min / IP** (shared) | **Yes** — same bucket |
| `POST /api/auth/login` | N/A | — | — | **Route does not exist** |

**Important:** `/auth/me` and `/student/dashboard` are **not** protected by `authLimiter` (10/15min). Their 429s in k6 were almost certainly from the **shared global 120/15min counter**, not from auth brute-force protection.

---

## 5. Recommendations (for future review — do not apply blindly)

### Security principle

> Raise limits only for **public read** and **authenticated session read** endpoints.  
> **Do not** remove or drastically loosen limits on credential submission, OAuth, payments, or enrollment.

### Per-endpoint guidance

| Endpoint | Current | Recommended direction | Rationale |
|----------|---------|----------------------|-----------|
| **`GET /api/health`** | 120/15min (global) | **Exempt from global limiter** or dedicated **300+/15min/IP** | Monitoring/uptime probes; no sensitive data |
| **`GET /api/public/landing`** | 120/15min (global) | Dedicated **100–300/min/IP** or exempt + CDN cache | Public marketing data; already cached 60s server-side |
| **`POST` Supabase password login** | Supabase Dashboard | Keep **strict** (e.g. **5–10/min/IP** equivalent) | Brute-force protection — tune in Dashboard only |
| **`GET /api/auth/me`** | 120/15min (global) | **Separate bucket: 60–100/min/IP** (authenticated) | Called on every app navigation; should not share bucket with anonymous flood |
| **`GET /api/student/dashboard`** | 120/15min (global) | **Same as `/auth/me`** or per-user **60/min** | Normal student usage; global IP cap too low for SPA + load tests |
| **`POST /auth/setup-profile`** | authLimiter **10/15min/IP+email** | **Keep as-is** or minor tuning | Onboarding abuse protection |
| **OAuth routes** | 20/10min/IP | **Keep as-is** | Reasonable for OAuth callbacks |

### Implementation options (when approved)

1. **`skip` in global limiter** for `/api/health` and `/api/public/landing` (mirror existing webhook skip pattern in `rateLimit.js`).
2. **Tiered limiters:** replace single global limiter with route-specific mounts (public high, authenticated medium, auth POST strict).
3. **Load testing:** run k6 against staging with `DISABLE_RATE_LIMIT=true` on backend **only in isolated staging** — never in production.
4. **k6 methodology:** distribute VUs across multiple IPs or lower VU count when testing production.

### Env escape hatch (existing)

`DISABLE_RATE_LIMIT=true` in backend env disables global + resource limiters (see `rateLimit.js`, `resourceLimits.js`). **Production use is strongly discouraged.**

---

## 6. Mapping k6 results → limits

From the production k6 run (~2.5 min, 31 max VUs, single runner IP):

| Metric | Result | Interpretation |
|--------|--------|----------------|
| `public/landing` API 200 | ~34% | Global 120/15min exhausted early; remaining requests 429 |
| `/health` 200 | ~33% | Same shared counter |
| Supabase login 200 | ~58% | Supabase Auth throttle (separate from Express) |
| `/auth/me` 200 | ~19% | Many iterations: login failed **or** global bucket already empty |
| `http_req_failed` | 34% | Mix of Express 429 + Supabase 429 |
| Landing/login **HTML** | ~100% | Not behind Express API limiter |

**Effective throughput ceiling (single IP, production backend):** ~**120 API requests per 15 minutes** (~**8 req/min average**) across **all** `/api/*` endpoints combined.

---

## 7. File reference index

| File | Role |
|------|------|
| `backend/src/middleware/rateLimit.js` | Global `limiter` — **120/15min/IP** |
| `backend/src/app.js` | Mounts limiter on `/api`, `/auth` |
| `backend/src/middleware/security.js` | `authLimiter`, `authSlowDown` |
| `backend/src/middleware/oauth-security.js` | `oauthLimiter` |
| `backend/src/middleware/resourceLimits.js` | Payment, enrollment, list, admin limiters |
| `backend/src/routes/public.js` | Promo POST limiter only |
| `backend/src/routes/auth.js` | Where `authLimiter` is attached |
| `frontend/hooks/useAuth.js` | Supabase `signInWithPassword` |
| `frontend/next.config.mjs` | `/peak-api` rewrite to Railway |
| `frontend/vercel.json` | Headers only — no rate limits |
| `frontend/proxy.js` | Auth middleware — no rate limits |
| `backend/SECURITY.md` | Documents `authLimiter (10/15min)` |

---

## 8. Decision checklist (before changing limits)

- [ ] Confirm change targets **public/read** routes only
- [ ] Leave Supabase Auth Dashboard limits strict for sign-in
- [ ] Leave `authLimiter` on `setup-profile` / `complete-profile` unchanged unless security review approves
- [ ] Re-run k6 on **staging** after changes
- [ ] Monitor `securityLogger` 429 lines and Supabase Auth metrics post-change
