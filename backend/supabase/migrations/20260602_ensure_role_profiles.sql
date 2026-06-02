-- Backfill role-specific profiles for existing auth users

insert into public.teacher_profiles (user_id, subjects, commission_rate)
select u.id, '[]'::jsonb, 70.00
from public.users u
where u.role = 'teacher'
on conflict (user_id) do nothing;

insert into public.student_profiles (user_id, grade, link_code)
select u.id, 'third', upper(substr(replace(u.id::text, '-', ''), 1, 8))
from public.users u
where u.role = 'student'
on conflict (user_id) do nothing;
