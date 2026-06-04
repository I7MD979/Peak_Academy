-- Peak Academy - align schema with backend prompt contracts

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null unique,
  name_en text,
  icon text
);

alter table public.sessions add column if not exists subject_id uuid references public.subjects(id);
alter table public.sessions add column if not exists description text;
alter table public.sessions add column if not exists daily_room_url text;
alter table public.sessions add column if not exists ended_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sessions' and column_name = 'room_url'
  ) then
    update public.sessions
    set daily_room_url = coalesce(daily_room_url, room_url)
    where room_url is not null and daily_room_url is null;
  end if;
end $$;

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  parent_id uuid references public.users(id) on delete set null,
  grade text check (grade in ('first', 'second', 'third')),
  section text,
  streak_days int not null default 0,
  link_code text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  bio text,
  subjects jsonb not null default '[]'::jsonb,
  rating numeric(3,2) not null default 5.00,
  commission_rate numeric(5,2) not null default 70.00,
  id_verified boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.student_profiles (user_id, grade, link_code)
select u.id, 'third', substr(replace(u.id::text, '-', ''), 1, 8)
from public.users u
where u.role = 'student'
on conflict (user_id) do nothing;

insert into public.teacher_profiles (user_id)
select u.id
from public.users u
where u.role = 'teacher'
on conflict (user_id) do nothing;

create table if not exists public.session_enrollments (
  id text primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  payment_id text references public.transactions(id) on delete set null,
  status text not null default 'enrolled' check (status in ('enrolled', 'attended', 'cancelled')),
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  unique(session_id, student_id)
);

insert into public.session_enrollments (id, session_id, student_id, payment_id, status, created_at)
select e.id, e.session_id, sp.id, e.payment_id, e.status, e.created_at
from public.enrollments e
join public.student_profiles sp on sp.user_id = e.student_id
on conflict (id) do nothing;

create table if not exists public.teacher_earnings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  session_id text not null references public.sessions(id) on delete cascade,
  gross_amount numeric(10,2) not null default 0,
  teacher_amount numeric(10,2) not null default 0,
  platform_amount numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawal_requests (
  id text primary key,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text,
  account_number text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

insert into public.withdrawal_requests (id, teacher_id, amount, method, notes, status, requested_at)
select w.id, tp.id, w.amount, w.method, w.notes, w.status, w.created_at
from public.withdrawals w
join public.teacher_profiles tp on tp.user_id = w.teacher_id
on conflict (id) do nothing;

alter table public.transactions add column if not exists paymob_order_id text;
alter table public.transactions add column if not exists paymob_txn_id text;
alter table public.transactions add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.quiz_questions (
  id text primary key,
  session_id text references public.sessions(id) on delete cascade,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_option text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_answers (
  id text primary key,
  question_id text not null references public.quiz_questions(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  selected_option text,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);
