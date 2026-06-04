# Peak Academy

Egyptian EdTech platform for Thanaweya Amma students — live small-group sessions, Paymob payments, and parent reports.

## Structure

| Directory | Stack |
|-----------|--------|
| `frontend/` | Next.js 14, Tailwind, Supabase Auth |
| `backend/` | Node.js 20, Express, Supabase PostgreSQL |
| `docs/` | Plans and migration notes |

## Local development

```bash
# Backend (port 4000)
cd backend && cp .env.example .env && npm install && npm run dev

# Frontend (port 3000)
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

## Railway (backend API)

Railpack fails if it builds from the **repo root** without config — there is no root `package.json`.

**Option A (recommended)**

1. Open the API service → **Settings**.
2. Set **Root Directory** to `backend`.
3. Set **Config file path** to `/backend/railway.toml`.
4. Redeploy.

**Option B (build from repo root)**

Keep root directory as `/`. The repo includes a root `Dockerfile` and `railway.toml` that build `backend/`. Redeploy after pulling latest `main`.

### Required env vars (Railway)

The container **exits immediately** if these are missing (healthcheck will fail):

| Variable | Required |
|----------|----------|
| `SUPABASE_URL` | Yes |
| `SUPABASE_SERVICE_KEY` | Yes (service role, not anon) |
| `FRONTEND_URL` | Yes for CORS (e.g. `https://peak-academy.net`) |
| `NODE_ENV` | `production` (set automatically in Docker) |

Optional: `PAYMOB_*`, `DAILY_API_KEY`, `FF_SCHEMA_V2=true` (after v2 migration), `REDIS_URL` + `FF_REDIS_QUEUE_ENABLED`.

Check deploy logs: you should see `Listening on http://0.0.0.0:<PORT>` before the healthcheck runs.

## Database migrations

Apply in Supabase SQL Editor (in order):

1. `backend/supabase/migrations/20260609_master_schema_v2.sql`
2. `backend/supabase/migrations/20260610_master_schema_uuid.sql` (optional)

Then reload the API schema and enable `FF_SCHEMA_V2` on the backend.

See [docs/schema-v2-migration-inventory.md](docs/schema-v2-migration-inventory.md).

## Frontend hosting

Deploy `frontend/` on Vercel with `NEXT_PUBLIC_API_URL` pointing to your Railway API URL.
