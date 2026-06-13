# Peak Academy — k6 Load Test Setup

This document describes how to run load tests against Peak Academy using `peak-load-test.js` at the repository root.

## Architecture (what k6 hits)

| Layer | Production URL | Notes |
|-------|----------------|-------|
| **Frontend (Next.js)** | `https://peak-academy.net` | Vercel — landing pages, auth UI |
| **Backend API (Express)** | `https://peakacademy-production.up.railway.app/api` | Railway |
| **API via frontend proxy** | `https://peak-academy.net/peak-api/*` | Next.js rewrite → Railway (same as browser) |

There is **no separate staging Supabase project** in this repo. All environments point to the same project ref (`hpczrdvaeazrrrzgtatl`). For load tests, prefer hitting **production URLs with low VU counts**, or point `BASE_URL` / `API_URL` at a Vercel preview + Railway if you create one.

## Endpoints used by `peak-load-test.js`

### Browsing flow (no auth)

| Step | Method | URL | Source in codebase |
|------|--------|-----|-------------------|
| Landing page | `GET` | `{BASE_URL}/` | `frontend/app/page.js` |
| Landing data API | `GET` | `{API_URL}/public/landing` | `backend/src/routes/public.js` |
| Health check | `GET` | `{API_URL}/health` | `backend/src/app.js` |
| Login page (HTML) | `GET` | `{BASE_URL}/auth/login` | `frontend/app/auth/login/page.jsx` |

There is **no** `/api/courses` route. Public educational/marketing content for the landing page comes from **`/api/public/landing`** (subscription plans + platform stats).

### Login flow (authenticated)

Peak Academy does **not** use `POST /api/auth/login`. Login is handled by **Supabase Auth** on the client (`supabase.auth.signInWithPassword` in `frontend/hooks/useAuth.js`).

k6 authenticates via Supabase REST:

| Step | Method | URL | Body |
|------|--------|-----|------|
| Login | `POST` | `{SUPABASE_URL}/auth/v1/token?grant_type=password` | `{ "email": "...", "password": "..." }` |

**Required headers:** `apikey: <SUPABASE_ANON_KEY>`, `Content-Type: application/json`

**Response:** JSON with `access_token`, `refresh_token`, `user` (JWT in body — **not** a session cookie for the backend).

Authenticated backend calls use:

```
Authorization: Bearer <access_token>
```

| Step | Method | URL | Role |
|------|--------|-----|------|
| Current user | `GET` | `{API_URL}/auth/me` | any authenticated user |
| Student dashboard data | `GET` | `{API_URL}/student/dashboard` | student |
| Dashboard page (HTML) | `GET` | `{BASE_URL}/student/dashboard` | SSR — may redirect without Supabase browser cookies |

Post-login redirect for students (app logic): **`/student/dashboard`** (`frontend/lib/role-routes.js` → `ROLE_HOME.student`).

## Environment variables for k6

```bash
# Defaults in script (production)
BASE_URL=https://peak-academy.net
API_URL=https://peak-academy.net/peak-api

# Required for loginFlow
SUPABASE_URL=https://hpczrdvaeazrrrzgtatl.supabase.co
SUPABASE_ANON_KEY=<from Supabase Dashboard → Settings → API → anon public>
```

Get the anon key from the same place as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local` (do **not** use the service_role key in k6).

### Example: local backend + frontend

```bash
k6 run \
  -e BASE_URL=http://localhost:3000 \
  -e API_URL=http://localhost:4000/api \
  -e SUPABASE_URL=https://hpczrdvaeazrrrzgtatl.supabase.co \
  -e SUPABASE_ANON_KEY=your_anon_key \
  peak-load-test.js
```

### Example: production (low load only)

```bash
k6 run \
  -e SUPABASE_ANON_KEY=your_anon_key \
  peak-load-test.js
```

## Test accounts

Three **student** accounts for the login scenario:

| Email | Password | Role |
|-------|----------|------|
| `loadtest1@test.com` | `TestPass123!` | student |
| `loadtest2@test.com` | `TestPass123!` | student |
| `loadtest3@test.com` | `TestPass123!` | student |

Each account has a completed student profile (grade set) so `/auth/me` and `/student/dashboard` return 200.

### Option A — Recommended: setup script

From `backend/` (requires `SUPABASE_SERVICE_KEY` in `.env`):

```bash
cd backend
npm run setup:loadtest
```

This uses `supabase.auth.admin.createUser` + `ensureUserProfile()` (same pattern as `setup-super-admin.mjs`). Safe to re-run — updates passwords and profiles idempotently.

### Option B — Supabase Dashboard (manual)

1. Open [Supabase Auth → Users](https://supabase.com/dashboard/project/hpczrdvaeazrrrzgtatl/auth/users).
2. **Add user** for each email above with password `TestPass123!`, enable **Auto Confirm User**.
3. In **SQL Editor**, for each new user UUID run (replace placeholders):

```sql
-- Replace :user_id and :email for each account
insert into public.users (id, email, full_name, role, is_active, is_verified)
values (:user_id, 'loadtest1@test.com', 'Load Test Student 1', 'student', true, true)
on conflict (id) do update set
  role = 'student',
  is_active = true,
  is_verified = true,
  full_name = excluded.full_name;

insert into public.student_profiles (user_id, grade, link_code)
values (
  :user_id,
  'sec_third',
  upper(replace(substr(:user_id::text, 1, 8), '-', ''))
)
on conflict (user_id) do update set grade = excluded.grade;
```

Repeat with grades `sec_second` / `sec_first` for users 2 and 3.

## How to run

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/), then from the repo root:

```bash
# 1. Create test users (once)
cd backend && npm run setup:loadtest && cd ..

# 2. Run load test (set anon key)
k6 run -e SUPABASE_ANON_KEY=your_anon_key peak-load-test.js
```

### Scenarios inside the script

1. **`browsingFlow`** — ramps to 25 VUs: landing page, `/public/landing`, `/health`, login page.
2. **`loginFlow`** — ramps to 8 VUs (starts after 30s): Supabase login → `/auth/me` → `/student/dashboard` API.

Adjust stages in `peak-load-test.js` before running heavy tests.

## Limits and caveats

### Supabase Auth

- Password grant counts against Auth rate limits and DB connections.
- Free/pro tier: watch **connection pool size** (Dashboard → Database → Connection pooling). Many concurrent logins can exhaust pooler slots.
- Auth endpoints may throttle aggressive IP bursts.

### Supabase Postgres

- Backend uses `service_role` + connection pooler; high API load increases DB CPU and active connections.
- Cached routes (e.g. `/public/landing` TTL 60s, student dashboard cache) reduce load — first-hit latency can differ from steady state.

### Railway (backend)

- Single service instance limits concurrent requests; scale horizontally in Railway for serious tests.
- Cold starts after idle can skew first-request latency.

### Vercel (frontend)

- Serverless functions and **rate limits** on SSR routes (`/`, `/student/dashboard`).
- Edge/middleware (`frontend/proxy.js`) runs on every request — high RPS on HTML routes may hit platform limits before the API does.

### k6 vs real browser login

- Real users store Supabase session in **cookies**; k6 uses **Bearer JWT** for API calls (correct for backend load).
- `GET /student/dashboard` HTML may return 307/401 without cookies even when API calls succeed — this is expected.

## Files touched (test infra only)

| File | Purpose |
|------|---------|
| `peak-load-test.js` | k6 script (root) |
| `backend/scripts/setup-loadtest-users.mjs` | Creates the three student accounts |
| `LOAD_TEST_SETUP.md` | This guide |

No application business logic was modified.
