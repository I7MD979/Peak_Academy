-- Peak Academy: run this in Supabase SQL Editor (after users table exists)
-- Fixes: missing sessions table / 500 on GET /api/sessions

-- 1) Core sessions + transactions (from core_domain_tables)
create table if not exists public.sessions (
  id text primary key,
  teacher_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  subject text not null default 'general',
  grade text not null check (grade in ('first', 'second', 'third')),
  scheduled_at timestamptz not null,
  duration_min int not null check (duration_min between 30 and 180),
  max_students int not null check (max_students between 2 and 20),
  price_per_student numeric(10,2) not null check (price_per_student >= 0),
  status text not null default 'scheduled',
  room_url text,
  created_at timestamptz not null default now()
);

alter table public.sessions drop constraint if exists sessions_status_check;
alter table public.sessions
  add constraint sessions_status_check
  check (status in ('scheduled', 'live', 'cancelled', 'completed'));

alter table public.sessions add column if not exists subject_id uuid references public.subjects(id);
-- After adding subject_id, reload PostgREST schema in Supabase: Settings → API → Reload schema
alter table public.sessions add column if not exists description text;
alter table public.sessions add column if not exists daily_room_url text;
alter table public.sessions add column if not exists ended_at timestamptz;

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  amount numeric(10,2) not null check (amount >= 0),
  status text not null check (status in ('pending', 'completed', 'failed')),
  gateway_ref text,
  provider text default 'mock',
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists paymob_order_id text;
alter table public.transactions add column if not exists paymob_txn_id text;
alter table public.transactions add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2) Profiles + subjects (from prompt_contract_alignment)
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null unique,
  name_en text,
  icon text
);

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

insert into public.teacher_profiles (user_id)
select u.id from public.users u where u.role = 'teacher'
on conflict (user_id) do nothing;

insert into public.student_profiles (user_id, grade, link_code)
select u.id, 'third', upper(substr(replace(u.id::text, '-', ''), 1, 8))
from public.users u where u.role = 'student'
on conflict (user_id) do nothing;

-- ولي الأمر: لا جدول منفصل — يستخدم public.users + ربط الأبناء عبر student_profiles.parent_id

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

create index if not exists idx_sessions_teacher_id on public.sessions(teacher_id);
create index if not exists idx_sessions_status_scheduled_at on public.sessions(status, scheduled_at);
create index if not exists idx_withdrawal_requests_status on public.withdrawal_requests(status, requested_at);

create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_user_read_created
  on public.notifications(user_id, is_read, created_at desc);

create table if not exists public.question_pricing (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  grade text not null check (grade in ('first', 'second', 'third')),
  amount numeric(10,2) not null check (amount >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (subject, grade)
);

create index if not exists idx_question_pricing_subject_grade
  on public.question_pricing(subject, grade);

create table if not exists public.questions (
  id text primary key,
  student_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid references public.users(id) on delete set null,
  subject text not null,
  content text not null,
  answer text,
  status text not null default 'unanswered' check (status in ('unanswered', 'answered')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create index if not exists idx_questions_status_subject on public.questions(status, subject);
create index if not exists idx_questions_student_created on public.questions(student_id, created_at desc);

create table if not exists public.study_rooms (
  id text primary key,
  subject text not null,
  grade text not null check (grade in ('first', 'second', 'third')),
  status text not null default 'open' check (status in ('open', 'active', 'closed')),
  capacity int not null default 6 check (capacity between 2 and 12),
  created_at timestamptz not null default now()
);

create table if not exists public.study_room_members (
  id text primary key,
  room_id text not null references public.study_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique(room_id, user_id, joined_at)
);

create index if not exists idx_study_rooms_status_subject on public.study_rooms(status, subject);
create index if not exists idx_study_room_members_room on public.study_room_members(room_id) where left_at is null;

-- Payments & promotions (20260605)
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(10,2) not null,
  sessions_per_month int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.subscription_plans (name, price, sessions_per_month)
values ('silver', 299, 4), ('gold', 499, 10) on conflict (name) do nothing;

create table if not exists public.student_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'active',
  sessions_remaining int not null default 0,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  paymob_subscription_id text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.free_trial_uses (
  student_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  used_at timestamptz not null default now(),
  session_id text references public.sessions(id) on delete set null,
  primary key (student_id, teacher_id, subject_id)
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null,
  discount_type text not null,
  discount_value numeric(10,2) not null,
  min_sessions int not null default 1,
  bonus_sessions int not null default 0,
  max_uses int,
  used_count int not null default 0,
  per_user_limit int not null default 1,
  applies_to text not null default 'all',
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.promotion_uses (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  enrollment_id text references public.session_enrollments(id) on delete set null,
  discount_applied numeric(10,2) not null default 0,
  used_at timestamptz not null default now()
);

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.users(id) on delete cascade,
  code text not null unique,
  total_referrals int not null default 0,
  earned_sessions int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists promotion_id uuid references public.promotions(id);
alter table public.transactions add column if not exists discount_amount numeric(10,2) not null default 0;
alter table public.transactions add column if not exists original_amount numeric(10,2);

-- === Master Prompt v2 (after core tables above) ===
-- Run full script: backend/supabase/migrations/20260609_master_schema_v2.sql
-- Then optional UUID map: backend/supabase/migrations/20260610_master_schema_uuid.sql
-- Enable on Railway: FF_SCHEMA_V2=true
