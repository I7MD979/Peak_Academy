-- Peak Academy — payments, subscriptions, promotions

-- Subscription plans
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(10,2) not null check (price >= 0),
  sessions_per_month int not null check (sessions_per_month > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.subscription_plans (name, price, sessions_per_month)
values ('silver', 299, 4), ('gold', 499, 10)
on conflict (name) do update set
  price = excluded.price,
  sessions_per_month = excluded.sessions_per_month,
  is_active = true;

create table if not exists public.student_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'cancelled', 'expired', 'paused')),
  sessions_remaining int not null check (sessions_remaining >= 0),
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
  type text not null check (type in ('coupon', 'bundle', 'early_bird', 'referral')),
  discount_type text not null check (discount_type in ('percent', 'fixed', 'free_session')),
  discount_value numeric(10,2) not null check (discount_value >= 0),
  min_sessions int not null default 1,
  bonus_sessions int not null default 0,
  max_uses int,
  used_count int not null default 0,
  per_user_limit int not null default 1,
  applies_to text not null default 'all'
    check (applies_to in ('all', 'per_session', 'subscription')),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
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

alter table public.transactions add column if not exists promotion_id uuid references public.promotions(id) on delete set null;
alter table public.transactions add column if not exists discount_amount numeric(10,2) not null default 0;
alter table public.transactions add column if not exists original_amount numeric(10,2);

create index if not exists idx_student_subs_student on public.student_subscriptions(student_id, status);
create index if not exists idx_student_subs_period on public.student_subscriptions(current_period_end);
create index if not exists idx_free_trial_student on public.free_trial_uses(student_id);
create index if not exists idx_promotions_code on public.promotions(code) where is_active = true;
create index if not exists idx_promo_uses_user on public.promotion_uses(user_id, promotion_id);
create index if not exists idx_referral_code on public.referral_codes(code);

-- RLS (service role bypasses; authenticated read own data)
alter table public.student_subscriptions enable row level security;
alter table public.free_trial_uses enable row level security;
alter table public.referral_codes enable row level security;
alter table public.promotion_uses enable row level security;

drop policy if exists "student_subscriptions_select_own" on public.student_subscriptions;
create policy "student_subscriptions_select_own"
on public.student_subscriptions for select to authenticated
using (auth.uid() = student_id);

drop policy if exists "free_trial_uses_select_own" on public.free_trial_uses;
create policy "free_trial_uses_select_own"
on public.free_trial_uses for select to authenticated
using (auth.uid() = student_id);

drop policy if exists "referral_codes_select_own" on public.referral_codes;
create policy "referral_codes_select_own"
on public.referral_codes for select to authenticated
using (auth.uid() = owner_id);

drop policy if exists "promotion_uses_select_own" on public.promotion_uses;
create policy "promotion_uses_select_own"
on public.promotion_uses for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "subscription_plans_select_all" on public.subscription_plans;
create policy "subscription_plans_select_all"
on public.subscription_plans for select to authenticated
using (is_active = true);
