-- Peak Academy — promote teacher@peak.com to teacher (run in Supabase SQL Editor)
-- User ID from Auth dashboard: 1af0ab42-cad0-4091-ba9a-3d4756b4b9d1

-- === 0) Diagnose current state ===
select
  au.id,
  au.email,
  au.email_confirmed_at,
  au.raw_user_meta_data->>'role' as auth_meta_role,
  u.role as db_role,
  u.full_name,
  tp.id as teacher_profile_id,
  sp.id as student_profile_id
from auth.users au
left join public.users u on u.id = au.id
left join public.teacher_profiles tp on tp.user_id = au.id
left join public.student_profiles sp on sp.user_id = au.id
where au.email = 'teacher@peak.com'
   or au.id = '1af0ab42-cad0-4091-ba9a-3d4756b4b9d1';

-- === 1) Confirm email (fixes login 400 "email not confirmed") ===
-- Note: confirmed_at is a generated column in Supabase — do not update it directly.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where id = '1af0ab42-cad0-4091-ba9a-3d4756b4b9d1';

-- === 2) public.users — MUST be role = teacher ===
insert into public.users (id, email, full_name, role, is_active, is_verified)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', 'ahmed mohamed abdo'),
  'teacher',
  true,
  true
from auth.users
where id = '1af0ab42-cad0-4091-ba9a-3d4756b4b9d1'
on conflict (id) do update set
  role = 'teacher',
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.users.full_name),
  is_active = true,
  is_verified = true;

-- === 3) teacher_profiles row ===
insert into public.teacher_profiles (user_id, subjects, commission_rate)
values ('1af0ab42-cad0-4091-ba9a-3d4756b4b9d1', '[]'::jsonb, 70.00)
on conflict (user_id) do nothing;

-- === 4) Remove mistaken student profile ===
delete from public.student_profiles
where user_id = '1af0ab42-cad0-4091-ba9a-3d4756b4b9d1';

-- === 5) Auth metadata (JWT role on next login) ===
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'teacher', 'full_name', 'ahmed mohamed abdo')
where id = '1af0ab42-cad0-4091-ba9a-3d4756b4b9d1';

-- === 6) Verify — db_role must be teacher, teacher_profile_id NOT null ===
select
  u.id,
  u.email,
  u.role as db_role,
  tp.id as teacher_profile_id,
  au.email_confirmed_at
from public.users u
join auth.users au on au.id = u.id
left join public.teacher_profiles tp on tp.user_id = u.id
where u.id = '1af0ab42-cad0-4091-ba9a-3d4756b4b9d1';
