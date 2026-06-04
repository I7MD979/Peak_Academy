-- Allow authenticated users to read/update their own role profiles (frontend onboarding checks)

alter table if exists public.student_profiles enable row level security;
alter table if exists public.teacher_profiles enable row level security;

drop policy if exists "student_profiles_select_own" on public.student_profiles;
create policy "student_profiles_select_own"
on public.student_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "student_profiles_insert_own" on public.student_profiles;
create policy "student_profiles_insert_own"
on public.student_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "student_profiles_update_own" on public.student_profiles;
create policy "student_profiles_update_own"
on public.student_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "teacher_profiles_select_own" on public.teacher_profiles;
create policy "teacher_profiles_select_own"
on public.teacher_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "teacher_profiles_insert_own" on public.teacher_profiles;
create policy "teacher_profiles_insert_own"
on public.teacher_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "teacher_profiles_update_own" on public.teacher_profiles;
create policy "teacher_profiles_update_own"
on public.teacher_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
