# Fix `42501: must be owner of table sessions`

The Supabase **SQL Editor** sometimes runs as a role that **cannot** change constraints on `public.sessions`. Use one of these methods instead.

## 1. Diagnose (run in SQL Editor — read-only is OK)

```sql
select current_user as role, session_user;
select rolsuper from pg_roles where rolname = current_user;
select tablename, tableowner from pg_tables
where schemaname = 'public' and tablename = 'sessions';
```

If `rolsuper` is `false`, do **not** use SQL Editor for `ALTER TABLE`.

## 2. Recommended: Supabase CLI migration

From the repo root (with [Supabase CLI](https://supabase.com/docs/guides/cli) installed):

```bash
cd backend
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This applies `backend/supabase/migrations/`, including `20260611_sessions_duration_constraints.sql`.

## 3. Direct `psql` (database password)

In Dashboard → **Settings → Database**:

1. Copy the **Direct connection** URI (host `db.xxx.supabase.co`, port **5432**).
2. Use the database password (not the anon/service API keys).

```bash
psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres" -f backend/supabase/migrations/20260611_sessions_duration_constraints.sql
```

## 4. After success

Dashboard → **Settings → API → Reload schema**, then retry creating/starting a session.

## 5. Still blocked?

- Confirm you are **Owner** of the Supabase project (not only a read-only org member).
- In Dashboard → **Database → Migrations**, check whether `20260604_sessions_live_status` already ran.
- Open a Supabase support ticket if `tableowner` is not `postgres` / `supabase_admin` and CLI `db push` also fails with `42501`.
