-- Subscription plans: admin fields + seed copy

alter table public.subscription_plans
  add column if not exists description text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_label text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists features text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

update public.subscription_plans
set
  features = array[
    '٤ حصص كل شهر',
    'جميع المواد والمعلمين',
    'أولوية الحجز',
    'تقارير أسبوعية'
  ],
  sort_order = 1,
  is_featured = false
where name ilike '%silver%';

update public.subscription_plans
set
  features = array[
    '١٠ حصص كل شهر',
    'جميع المواد والمعلمين',
    'أولوية الحجز المتقدم',
    'تقارير أسبوعية + تحليل',
    'خصم ٢٠٪ على الحصص الإضافية',
    'دعم أولوية'
  ],
  sort_order = 2,
  is_featured = true,
  featured_label = 'الأكثر طلباً'
where name ilike '%gold%';
