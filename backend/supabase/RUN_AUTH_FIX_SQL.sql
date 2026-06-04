-- Peak Academy — Auth Fix v2.0 (run in Supabase SQL Editor)
-- Order: run section 4 (verify trigger) first, then section 3 (RLS).

-- === FIX 3 — RLS (idempotent) ===
alter table public.users enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Service role full access" on public.users;
create policy "Service role full access"
on public.users
for all
to service_role
using (true)
with check (true);

-- === FIX 4 — Verify trigger + backfill example user ===
select trigger_name, event_manipulation, event_object_table
from information_schema.triggers
where trigger_schema = 'auth'
  and trigger_name = 'on_auth_user_created';

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'handle_new_user';

-- Manually insert missing Google user if trigger did not run (replace email as needed)
insert into public.users (id, email, full_name, avatar_url, role)
select
  id,
  email,
  coalesce(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    'مستخدم جديد'
  ),
  raw_user_meta_data->>'avatar_url',
  'student'
from auth.users
where email = 'ahmed.mohamed.abdo.abdo@gmail.com'
on conflict (id) do update set
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url;
