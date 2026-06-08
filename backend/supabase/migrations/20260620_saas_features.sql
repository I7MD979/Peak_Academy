-- Peak Academy — SaaS features (dunning, freeze, referrals, feature flags, onboarding)

-- ============================================================
-- 1. Subscription Grace Period + Dunning
-- ============================================================
alter table public.student_subscriptions
  add column if not exists grace_period_ends_at timestamptz,
  add column if not exists dunning_attempt_count int default 0,
  add column if not exists last_dunning_at timestamptz,
  add column if not exists data_deletion_at timestamptz;

alter table public.student_subscriptions
  add column if not exists frozen_at timestamptz,
  add column if not exists frozen_until timestamptz,
  add column if not exists freeze_count int default 0,
  add column if not exists freeze_reason text;

do $$
begin
  alter table public.student_subscriptions drop constraint if exists student_subscriptions_status_check;
  alter table public.student_subscriptions
    add constraint student_subscriptions_status_check
    check (status in ('active', 'cancelled', 'expired', 'paused', 'grace', 'past_due', 'frozen'));
exception when others then
  null;
end $$;

create table if not exists public.dunning_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.student_subscriptions(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  attempt_number int not null,
  channel text not null,
  status text not null default 'sent',
  sent_at timestamptz not null default now()
);

create table if not exists public.saas_config (
  key text primary key,
  value text not null,
  type text default 'string'
);

insert into public.saas_config (key, value, type) values
  ('max_freeze_days', '30', 'int'),
  ('min_freeze_days', '7', 'int'),
  ('max_freezes_per_year', '2', 'int'),
  ('grace_period_days', '5', 'int'),
  ('data_retention_days', '30', 'int')
on conflict (key) do nothing;

-- ============================================================
-- 3. Referral System extension
-- ============================================================
alter table public.referral_codes
  add column if not exists clicks int default 0,
  add column if not exists conversions int default 0,
  add column if not exists total_earned numeric(10,2) default 0,
  add column if not exists is_active boolean default true;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.users(id) on delete cascade,
  referred_id uuid unique references public.users(id) on delete cascade,
  referral_code_id uuid references public.referral_codes(id) on delete set null,
  status text default 'pending',
  rewarded_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. Feature Flags
-- ============================================================
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  name_ar text,
  is_enabled boolean default false,
  rules jsonb default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.feature_flag_overrides (
  feature_flag_id uuid references public.feature_flags(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  is_enabled boolean not null,
  primary key (feature_flag_id, user_id)
);

insert into public.feature_flags (key, name, name_ar, is_enabled) values
  ('live_sessions', 'Live Sessions', 'الجلسات المباشرة', true),
  ('parent_reports', 'Parent Reports', 'تقارير أولياء الأمور', true),
  ('ai_assistant', 'AI Assistant', 'المساعد الذكي', false),
  ('mobile_app', 'Mobile App', 'التطبيق المحمول', false)
on conflict (key) do nothing;

-- ============================================================
-- 5. In-App Notifications extensions
-- ============================================================
alter table public.notifications
  add column if not exists title_ar text,
  add column if not exists body_ar text,
  add column if not exists action_url text,
  add column if not exists metadata jsonb default '{}';

-- ============================================================
-- 6. Onboarding Checklist
-- ============================================================
create table if not exists public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  title_ar text,
  description_ar text,
  action_url text,
  sort_order int default 0,
  is_required boolean default false
);

create table if not exists public.user_onboarding (
  user_id uuid references public.users(id) on delete cascade,
  step_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, step_key)
);

insert into public.onboarding_steps (key, title, title_ar, action_url, sort_order, is_required) values
  ('complete_profile', 'Complete Profile', 'أكمل بياناتك', '/student/profile', 1, true),
  ('verify_phone', 'Verify Phone', 'تأكيد رقم الموبايل', '/student/profile', 2, false),
  ('choose_plan', 'Choose Plan', 'اختر خطة الاشتراك', '/student/subscription', 3, true),
  ('first_payment', 'First Payment', 'أتمم أول دفعة', '/student/subscription', 4, true),
  ('first_session', 'First Session', 'احضر أول جلسة', '/student/sessions', 5, false)
on conflict (key) do nothing;

create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
create index if not exists idx_dunning_sub on public.dunning_logs(subscription_id);
create index if not exists idx_ff_key on public.feature_flags(key);
