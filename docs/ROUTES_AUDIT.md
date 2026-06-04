# Peak Academy — Routes Audit (2026-06)

Full inventory of frontend (Next.js) and backend (Express) routes, issues found, and fixes applied.

---

## Frontend — App Router pages

| Route | File | Protection | Notes |
|-------|------|------------|-------|
| `/` | `app/page.js` | Public | Landing |
| `/login` | `app/login/page.js` | Public | → `/auth/login` |
| `/register` | `app/register/page.js` | Public | → `/auth/register` |
| `/dashboard` | `app/dashboard/page.js` | Auth | Server `resolvePostAuthPath`; middleware also resolves |
| `/sessions` | `app/sessions/page.js` | Auth | → role sessions URL or onboarding |
| `/onboarding` | `app/onboarding/page.js` | Auth | Complete profile; middleware skips if already complete |
| `/auth/login` | `app/auth/login/page.jsx` | Public | Supports `?redirect=` (sanitized) |
| `/auth/register` | `app/auth/register/page.js` | Public | Logged-in users redirected via middleware |
| `/auth/callback` | `app/auth/callback/route.js` | Public | OAuth; uses `resolvePostAuthPath` |
| `/auth/forgot-password` | `app/auth/forgot-password/page.js` | Public | Supabase reset email |
| `/auth/reset-password` | `app/auth/reset-password/page.js` | Public | Set new password after email link |
| `/auth/setup-profile` | `app/auth/setup-profile/page.js` | Public | → `/onboarding` |
| `/student/*` | `app/student/**` | Student + RoleGate | 8 pages |
| `/teacher/*` | `app/teacher/**` | Teacher + RoleGate | 7 pages |
| `/parent/*` | `app/parent/**` | Parent + RoleGate | 3 pages |
| `/admin/*` | `app/admin/**` | Admin + RoleGate | 7 pages |

### Rewrites (`next.config.mjs`)

| Source | Destination |
|--------|-------------|
| `/peak-api/:path*` | Railway `${API_UPSTREAM}/api/:path*` |
| `/student/my-sessions` | `/student/sessions?tab=mine` (308) |

---

## Frontend — Middleware

**File:** `frontend/middleware.js`

| Feature | Behavior |
|---------|----------|
| Preview Basic Auth | `*.vercel.app` except `*-kappa.*` → user `peak` |
| Production | `peak-academy.net` — no Basic Auth |
| Public paths | `/`, `/auth/*` (login, register, callback, forgot, reset, setup-profile) |
| No session | → `/auth/login?redirect=<path>` |
| Logged-in on login/register | → `resolvePostAuthPath` (edge) |
| Role prefixes | `/student`, `/teacher`, `/parent`, `/admin` — API profile + `isProfileComplete` |
| Incomplete profile on role routes | → `/onboarding` |
| Wrong role | → correct `ROLE_HOME` dashboard |
| `/onboarding` + complete profile | → role dashboard |
| Excluded | `peak-api`, static assets |

**Helpers:** `frontend/lib/role-routes-edge.js` (edge-safe), `frontend/lib/safe-redirect.js`

---

## Frontend — Post-auth routing (single logic)

| Module | Used by |
|--------|---------|
| `lib/role-routes.js` | Client forms, RoleGate |
| `lib/role-routes-server.js` | `auth/callback`, `dashboard` page |
| `lib/role-routes-edge.js` | `middleware.js` |

Flow: `GET /api/auth/me` → if incomplete → `/onboarding` → else `ROLE_HOME[role]`.

---

## Backend — Mounted API (`backend/src/app.js`)

All canonical paths under `/api/*`. Duplicate mount: `/auth/*` (same as `/api/auth/*`).

| Prefix | Router |
|--------|--------|
| `/api/health`, `/api/diag` | inline |
| `/api/auth` | `routes/auth.js` |
| `/api/sessions` | `sessions.js` |
| `/api/student` | `student.js` |
| `/api/payments` | `payments.js` |
| `/api/enrollments` | `enrollments.js` |
| `/api/promotions` | `promotions.js` |
| `/api/earnings` | `earnings.js` |
| `/api/questions` | `questions.js` |
| `/api/parent` | `parent.js` |
| `/api/admin` | `admin.js` + `adminPromotions.js` |
| `/api/subscriptions` | `subscriptions.js` |
| `/api/notifications` | `notifications.js` |
| `/api/study-rooms` | `studyRooms.js` |

**404:** JSON for any unknown `/api/*` or `/auth/*` path.

**Rate limit:** `/api` and `/auth` in production (webhook/stream skipped).

**API version:** `2026-06-09-schema-v2` (`X-Peak-Api-Version` header).

### Orphan route files (not mounted)

`marketplace.js`, `quizzes.js`, `reviews.js`, `recordings.js`, `studyReports.js` — CJS, not wired in ESM `app.js`. No frontend `api.js` references.

### Unused but mounted

- `POST /api/auth/complete-profile` — superseded by `setup-profile`

---

## Issues fixed in this audit

| Issue | Fix |
|-------|-----|
| OAuth callback skipped onboarding | Callback uses `resolvePostAuthPath` |
| Missing `/auth/forgot-password`, `/auth/reset-password` | New pages + forms |
| `?redirect=` ignored on login | `LoginForm` + `sanitizeRedirectPath` |
| Middleware role-only check | Uses `fetchAuthProfile` + `isProfileComplete` |
| Missing role → `/auth/login` loop | → `/onboarding` |
| `/register` 404 | Alias page |
| `/sessions` orphan browse page | Redirects by role |
| `role-routes-edge` unused | Wired in middleware |
| Backend 404 only matched shallow `/api/*` | Catch-all for `/api/` and `/auth/` |
| `/auth` bypassed rate limit | Included in limiter |
| Stale `sessions-v5` version checks | Updated to `2026-06-09-schema-v2` |
| Dead `redirectToOnboarding` in app.js | Removed |

---

## Manual / optional follow-ups

1. Run `backend/supabase/RUN_AUTH_FIX_SQL.sql` if RLS or Google user row missing.
2. Add Vercel preview origins to Railway `ALLOWED_ORIGINS` if API calls fail from preview.
3. Mount or delete orphan CJS route modules when features are needed.
4. Add Supabase redirect URL: `{origin}/auth/reset-password` for password reset emails.

---

## Test checklist

- [ ] Google OAuth → dashboard or `/onboarding` (not login loop)
- [ ] Email login with `?redirect=/student/sessions` lands correctly
- [ ] Forgot password email → reset page → login
- [ ] Student cannot open `/teacher/*` (redirect to student dashboard)
- [ ] Preview URL (non-kappa) prompts Basic Auth
- [ ] `peak-academy-kappa.vercel.app` no Basic Auth
- [ ] `GET /api/health` returns `api_version: 2026-06-09-schema-v2`
- [ ] Unknown `GET /api/foo/bar` → JSON 404
