-- Fourth quick-stat on landing page (beside monthly live sessions)

insert into public.platform_stats (key, value, label, hint, sort_order)
values
  ('pricing_starts', '80', 'تبدأ من 80 جنيه', 'أفضل قيمة مقابل جودة', 4)
on conflict (key) do update
set
  value = excluded.value,
  label = excluded.label,
  hint = excluded.hint,
  sort_order = excluded.sort_order,
  is_visible = true;
