-- Peak Academy - users profile table synced with Supabase Auth
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  phone text,
  full_name text not null,
  avatar_url text,
  role text not null check (role in ('student', 'teacher', 'parent', 'admin')),
  is_active boolean not null default true,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_is_active on public.users(is_active);

alter table public.users enable row level security;

drop policy if exists "users_select_own_profile" on public.users;
create policy "users_select_own_profile"
on public.users
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "users_update_own_profile" on public.users;
create policy "users_update_own_profile"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users_insert_own_profile" on public.users;
create policy "users_insert_own_profile"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "service_role_full_access_users" on public.users;
create policy "service_role_full_access_users"
on public.users
for all
to service_role
using (true)
with check (true);
