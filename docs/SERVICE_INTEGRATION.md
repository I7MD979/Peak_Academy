# Peak Academy — Service Integration

Environment variables are expected on **Railway** (backend) and **Vercel** (frontend).

## Backend (Railway)

| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Upstash REST cache |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST cache |
| `FF_REDIS_CACHE_ENABLED` | `true` — enable Redis cache (default in `.env.example`) |
| `FF_REDIS_QUEUE_ENABLED` | `false` — emails run inline via `enqueueJob` |
| `FF_SENTRY_ENABLED` | `true` — enable Sentry when `SENTRY_DSN` is set |
| `SENTRY_DSN` | Backend error tracking |
| `RESEND_API_KEY` | Transactional email |
| `RESEND_FROM` | Optional sender (default: `Peak Academy <noreply@peak-academy.net>`) |
| `DAILY_API_KEY` | Video rooms |
| `DAILY_DOMAIN` | Subdomain (default: `peak-academy`) |
| `PAYMOB_*` | Card checkout + webhook HMAC |

## Frontend (Vercel)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base (e.g. `https://api.peak-academy.net/api`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Client/server Sentry |

## Verification

1. **Redis:** `GET /api/diag` → `cache_mode` should be `upstash`, not `memory`.
2. **Resend:** Enroll (free or paid) → RTL confirmation email.
3. **Reminders:** Session starting in ~1.5h with paid enrollments → reminder email (cron every 30 min).
4. **Sentry:** Trigger an error with `FF_SENTRY_ENABLED=true` → event in Sentry dashboard.
5. **Daily:** Create session → `daily_room_name` in DB; `POST /api/sessions/:id/join` → `{ room_url, token }`.
6. **Paymob:** Paid enroll → redirect; webhook → enrollment confirmed + email.

## API additions

- `POST /api/sessions/:id/join` — meeting token for enrolled students / teacher (15 min before → 120 min after start).
