-- Peak Start / Rise / Summit — align features with sessions_per_month

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
where lower(name) like '%start%' or sessions_per_month = 4;

update public.subscription_plans
set
  features = array[
    '٨ حصص كل شهر',
    'جميع المواد والمعلمين',
    'أولوية الحجز المتقدم',
    'تقارير أسبوعية + تحليل',
    'دعم أولوية'
  ],
  sort_order = 2,
  is_featured = true,
  featured_label = 'الأكثر طلباً'
where lower(name) like '%rise%' or sessions_per_month = 8;

update public.subscription_plans
set
  features = array[
    '١٢ حصص كل شهر',
    'جميع المواد والمعلمين',
    'أولوية الحجز المتقدم',
    'تقارير أسبوعية + تحليل',
    'خصم على الحصص الإضافية',
    'دعم أولوية'
  ],
  sort_order = 3,
  is_featured = false
where lower(name) like '%summit%' or sessions_per_month = 12;
