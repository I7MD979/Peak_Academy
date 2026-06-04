-- Peak Academy — Master Prompt v2 schema (Phase 1A + 1B + 1D)
-- Apply in Supabase SQL Editor after backup. Reload API schema when done.

-- ========== 1A: Sessions column alignment ==========
alter table public.sessions add column if not exists start_time timestamptz;
alter table public.sessions add column if not exists duration_minutes int;
alter table public.sessions add column if not exists price numeric(10,2);
alter table public.sessions add column if not exists current_students int not null default 0;
alter table public.sessions add column if not exists daily_room_name text;
alter table public.sessions add column if not exists recording_url text;

update public.sessions set
  start_time = coalesce(start_time, scheduled_at),
  duration_minutes = coalesce(duration_minutes, duration_min),
  price = coalesce(price, price_per_student)
where start_time is null or duration_minutes is null or price is null;

-- ========== Legacy enrollments rename ==========
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'enrollments'
      and not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'enrollments' and column_name = 'payment_status'
      )
  ) then
    alter table public.enrollments rename to enrollments_legacy;
  end if;
end $$;

-- ========== 1B: RULE 2 enrollments (session_id TEXT until UUID phase) ==========
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  session_id text not null references public.sessions(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'attended', 'absent', 'refunded')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  enrolled_at timestamptz not null default now(),
  legacy_enrollment_id text,
  unique (student_id, session_id)
);

create index if not exists idx_enrollments_student on public.enrollments(student_id);
create index if not exists idx_enrollments_session on public.enrollments(session_id);
create index if not exists idx_enrollments_student_payment on public.enrollments(student_id, payment_status);

-- Migrate from session_enrollments
insert into public.enrollments (
  id, student_id, session_id, status, payment_status, enrolled_at, legacy_enrollment_id
)
select
  gen_random_uuid(),
  sp.user_id,
  se.session_id,
  case se.status
    when 'enrolled' then 'confirmed'
    when 'attended' then 'attended'
    when 'cancelled' then 'refunded'
    else 'confirmed'
  end,
  case
    when se.payment_id is not null then
      case coalesce(t.status, 'completed')
        when 'completed' then 'paid'
        when 'failed' then 'failed'
        else 'pending'
      end
    else 'paid'
  end,
  coalesce(se.created_at, now()),
  se.id
from public.session_enrollments se
join public.student_profiles sp on sp.id = se.student_id
left join public.transactions t on t.id = se.payment_id
on conflict (student_id, session_id) do nothing;

-- ========== payments table ==========
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references public.enrollments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  amount numeric(10,2) not null,
  original_amount numeric(10,2),
  discount_amount numeric(10,2) default 0,
  platform_fee numeric(10,2),
  teacher_earning numeric(10,2),
  paymob_order_id text,
  paymob_transaction_id text,
  payment_method text,
  promotion_id uuid references public.promotions(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  legacy_transaction_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_student on public.payments(student_id);
create index if not exists idx_payments_enrollment on public.payments(enrollment_id);
create index if not exists idx_payments_paymob on public.payments(paymob_order_id);

insert into public.payments (
  enrollment_id, student_id, amount, original_amount, discount_amount,
  platform_fee, teacher_earning, paymob_order_id, paymob_transaction_id,
  promotion_id, status, paid_at, legacy_transaction_id, created_at
)
select
  e.id,
  t.user_id,
  t.amount,
  coalesce(t.original_amount, t.amount),
  coalesce(t.discount_amount, 0),
  round(t.amount * 0.30, 2),
  round(t.amount * 0.70, 2),
  t.paymob_order_id,
  t.paymob_txn_id,
  t.promotion_id,
  case t.status when 'completed' then 'paid' when 'failed' then 'failed' else 'pending' end,
  case when t.status = 'completed' then t.created_at else null end,
  t.id,
  t.created_at
from public.transactions t
join public.enrollments e on e.legacy_enrollment_id = 'en-' || t.id
where t.type = 'session_payment'
  and t.metadata ? 'session_id'
on conflict do nothing;

-- Also link payments where enrollment legacy id matches transaction id pattern
insert into public.payments (
  enrollment_id, student_id, amount, original_amount, discount_amount,
  platform_fee, teacher_earning, paymob_order_id, paymob_transaction_id,
  promotion_id, status, paid_at, legacy_transaction_id, created_at
)
select
  e.id,
  t.user_id,
  t.amount,
  coalesce(t.original_amount, t.amount),
  coalesce(t.discount_amount, 0),
  round(t.amount * 0.30, 2),
  round(t.amount * 0.70, 2),
  t.paymob_order_id,
  t.paymob_txn_id,
  t.promotion_id,
  case t.status when 'completed' then 'paid' when 'failed' then 'failed' else 'pending' end,
  case when t.status = 'completed' then t.created_at else null end,
  t.id,
  t.created_at
from public.transactions t
join public.enrollments e on e.session_id = (t.metadata->>'session_id')
  and e.student_id = t.user_id
where t.type = 'session_payment'
  and not exists (select 1 from public.payments p where p.legacy_transaction_id = t.id)
on conflict do nothing;

-- Backfill current_students
update public.sessions s set current_students = coalesce((
  select count(*)::int from public.enrollments e
  where e.session_id = s.id and e.status in ('confirmed', 'attended')
), 0);

-- increment_session_count RPC
create or replace function public.increment_session_count(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sessions
  set current_students = coalesce(current_students, 0) + 1
  where id = p_session_id;
end;
$$;

-- increment promotion used_count
create or replace function public.increment_used_count(promo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.promotions set used_count = coalesce(used_count, 0) + 1 where id = promo_id;
end;
$$;

-- ========== 1D: parent_children, performance_reports, reviews ==========
create table if not exists public.parent_children (
  parent_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  primary key (parent_id, student_id)
);

-- Migrate parent–student links (parent_links and/or student_profiles.parent_id)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'parent_links'
  ) then
    insert into public.parent_children (parent_id, student_id)
    select parent_id, student_id from public.parent_links
    on conflict do nothing;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_profiles' and column_name = 'parent_id'
  ) then
    insert into public.parent_children (parent_id, student_id)
    select sp.parent_id, sp.user_id
    from public.student_profiles sp
    where sp.parent_id is not null
    on conflict do nothing;
  end if;
end $$;

create table if not exists public.performance_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  session_id text not null references public.sessions(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete cascade,
  attendance_pct int default 0,
  score numeric(5,2),
  engagement_score int check (engagement_score between 1 and 5),
  teacher_notes text,
  created_at timestamptz not null default now(),
  unique (student_id, session_id)
);

create index if not exists idx_perf_student on public.performance_reports(student_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete cascade,
  session_id text not null references public.sessions(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (student_id, session_id)
);

create index if not exists idx_reviews_teacher on public.reviews(teacher_id);

-- subjects.grade (RULE 2: '1','2','3')
alter table public.subjects add column if not exists grade text;
alter table public.subjects add column if not exists name text;

update public.subjects set
  name = coalesce(name, name_ar),
  grade = coalesce(grade,
    case name_en
      when 'first' then '1' when 'second' then '2' when 'third' then '3'
      else null
    end
  )
where name is null or grade is null;

-- teacher_profiles RULE 2 extras
alter table public.teacher_profiles add column if not exists balance numeric(12,2) default 0;
alter table public.teacher_profiles add column if not exists review_count int default 0;
alter table public.teacher_profiles add column if not exists subjects_text text[];

-- RULE 2 session indexes
create index if not exists idx_sessions_teacher on public.sessions(teacher_id);
create index if not exists idx_sessions_subject_start on public.sessions(subject_id, start_time desc nulls last);
create index if not exists idx_sessions_status_start on public.sessions(status, start_time desc nulls last);
create index if not exists idx_sessions_start on public.sessions(start_time desc nulls last);

-- RLS (basic — service role bypasses; tighten per role as needed)
alter table public.enrollments enable row level security;
alter table public.payments enable row level security;
alter table public.performance_reports enable row level security;

drop policy if exists enrollments_select_own on public.enrollments;
create policy enrollments_select_own on public.enrollments for select
  using (auth.uid() = student_id);

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments for select
  using (auth.uid() = student_id);
