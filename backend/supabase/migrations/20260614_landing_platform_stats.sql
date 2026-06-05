-- Landing page: platform stats + subscription plan display fields

create table if not exists public.platform_stats (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null,
  label text not null,
  hint text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_stats (key, value, label, hint, sort_order)
values
  ('dashboards', '4', 'لوحات متخصصة', 'طالب، معلّم، وليّ أمر، إدارة', 1),
  ('teachers', '500+', 'معلّم معتمد', 'على منهج الثانوية العامة', 2),
  ('sessions_monthly', '1,200+', 'جلسة لايف شهرياً', 'جلسات تفاعلية مع المعلّم', 3)
on conflict (key) do nothing;

alter table public.platform_stats enable row level security;

drop policy if exists "platform_stats_public_read" on public.platform_stats;
create policy "platform_stats_public_read"
on public.platform_stats for select
to anon, authenticated
using (true);

alter table public.subscription_plans
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_label text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists features text[] not null default '{}';

update public.subscription_plans
set
  sort_order = 1,
  features = array[
    'أول حصة مجانية بدون بطاقة',
    'تقرير أداء بعد الحصة',
    'تجربة مع أكثر من معلّم',
    'متابعة وليّ الأمر'
  ]
where name ilike '%مجان%' or name ilike '%free%';

update public.subscription_plans
set
  sort_order = 2,
  is_featured = false,
  features = array[
    '٤ حصص كل شهر',
    'جميع المواد والمعلمين',
    'أولوية الحجز',
    'تقارير أسبوعية للأهل',
    'خصم على العروض'
  ]
where lower(name) = 'silver';

update public.subscription_plans
set
  sort_order = 3,
  is_featured = true,
  featured_label = 'الأكثر طلباً',
  features = array[
    '١٠ حصص كل شهر',
    'جميع المواد والمعلمين',
    'أولوية الحجز المتقدم',
    'تقارير أسبوعية + تحليل',
    'خصم ٢٠٪ على الحصص الإضافية',
    'دعم أولوية'
  ]
where lower(name) = 'gold';
