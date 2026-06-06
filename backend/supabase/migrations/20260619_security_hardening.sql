-- Peak Academy — Security hardening (RLS additions, audit log, constraints)
-- Run manually in Supabase SQL Editor if not applied via migrations.
-- Does NOT drop or replace existing RLS policies.

-- ═══════════════════════════════════════════════════
-- PART A: Row Level Security additions — OWASP A01
-- ═══════════════════════════════════════════════════

alter table if exists public.users enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.enrollments enable row level security;
alter table if exists public.questions enable row level security;
alter table if exists public.withdrawal_requests enable row level security;
alter table if exists public.student_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_self_read'
  ) then
    create policy users_self_read on public.users
      for select using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_self_update'
  ) then
    create policy users_self_update on public.users
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'payments_self_read'
  ) then
    create policy payments_self_read on public.payments
      for select using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'enrollments' and policyname = 'enrollments_self_read'
  ) then
    create policy enrollments_self_read on public.enrollments
      for select using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'questions' and policyname = 'questions_self_read'
  ) then
    create policy questions_self_read on public.questions
      for select using (auth.uid() = student_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'withdrawal_requests' and policyname = 'withdrawals_self_read'
  ) then
    create policy withdrawals_self_read on public.withdrawal_requests
      for select using (auth.uid() = teacher_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'student_subscriptions' and policyname = 'student_subscriptions_self'
  ) then
    create policy student_subscriptions_self on public.student_subscriptions
      for all using (auth.uid() = student_id);
  end if;
end $$;

-- ═══════════════════════════════════════════════════
-- PART B: Performance indexes
-- ═══════════════════════════════════════════════════

create index if not exists idx_payments_user_id on public.payments(student_id);
create index if not exists idx_payments_created_at on public.payments(created_at desc);
create index if not exists idx_enrollments_student_session on public.enrollments(student_id, session_id);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read);
create index if not exists idx_sessions_status_scheduled on public.sessions(status, scheduled_at);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'promotions' and column_name = 'code'
  ) then
    execute 'create index if not exists idx_promo_codes_code on public.promotions(code) where is_active = true';
  end if;
end $$;

-- ═══════════════════════════════════════════════════
-- PART C: Audit logging — NIST AU-2
-- ═══════════════════════════════════════════════════

create table if not exists public.security_audit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  resource text,
  resource_id uuid,
  ip_address text,
  user_agent text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_audit_log_user on public.security_audit_log(user_id, created_at desc);
create index if not exists idx_audit_log_action on public.security_audit_log(action, created_at desc);

create or replace function public.cleanup_old_audit_logs()
returns void
language plpgsql
as $$
begin
  delete from public.security_audit_log where created_at < now() - interval '90 days';
end;
$$;

-- ═══════════════════════════════════════════════════
-- PART D: Validation helpers — CWE-20
-- ═══════════════════════════════════════════════════

create or replace function public.is_valid_egyptian_phone(phone text)
returns boolean
language plpgsql
immutable
as $$
begin
  return phone ~ '^(\+20|0020|0)?1[0125]\d{8}$';
end;
$$;

create or replace function public.is_valid_uuid(val text)
returns boolean
language plpgsql
immutable
as $$
begin
  return val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
end;
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_users_email_format') then
    alter table public.users
      add constraint chk_users_email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_users_full_name_length') then
    alter table public.users
      add constraint chk_users_full_name_length check (length(full_name) between 2 and 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_users_role_valid') then
    alter table public.users
      add constraint chk_users_role_valid check (role in ('student', 'teacher', 'parent', 'admin'));
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sessions' and column_name = 'price')
     and not exists (select 1 from pg_constraint where conname = 'chk_sessions_price_range') then
    alter table public.sessions
      add constraint chk_sessions_price_range check (price >= 0 and price <= 10000);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_sessions_max_students') then
    alter table public.sessions
      add constraint chk_sessions_max_students check (max_students between 1 and 20);
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sessions' and column_name = 'duration_min')
     and not exists (select 1 from pg_constraint where conname = 'chk_sessions_duration_security') then
    alter table public.sessions
      add constraint chk_sessions_duration_security check (duration_min between 15 and 240);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_payments_amount_positive') then
    alter table public.payments
      add constraint chk_payments_amount_positive check (amount >= 0);
  end if;
end $$;
