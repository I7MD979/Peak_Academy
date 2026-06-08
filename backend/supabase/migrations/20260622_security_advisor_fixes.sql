-- Peak Academy — Supabase Security Advisor remediation
-- Addresses: mutable search_path, permissive RLS, public SECURITY DEFINER execute,
-- and avatars bucket listing.

-- ═══════════════════════════════════════════════════
-- 1) handle_new_user — fixed search_path + revoke public execute
-- ═══════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
begin
  v_role := coalesce(
    nullif(trim(new.raw_app_meta_data->>'role'), ''),
    nullif(trim(new.raw_user_meta_data->>'role'), ''),
    'student'
  );
  if v_role not in ('student', 'teacher', 'parent', 'admin') then
    v_role := 'student';
  end if;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1),
    'مستخدم جديد'
  );

  insert into public.users (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    v_name,
    new.raw_user_meta_data->>'avatar_url',
    v_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  if v_role = 'student' then
    insert into public.student_profiles (user_id, grade, link_code)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data->>'grade'), ''), 'third'),
      upper(substr(replace(new.id::text, '-', ''), 1, 8))
    )
    on conflict (user_id) do nothing;
  elsif v_role = 'teacher' then
    insert into public.teacher_profiles (user_id, subjects, commission_rate)
    values (new.id, '[]'::jsonb, 70.00)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════
-- 2) rls_auto_enable — search_path + revoke public execute (if present)
-- ═══════════════════════════════════════════════════

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'alter function public.rls_auto_enable() set search_path = public';
    revoke all on function public.rls_auto_enable() from public;
    revoke all on function public.rls_auto_enable() from anon, authenticated;
    grant execute on function public.rls_auto_enable() to service_role;
  end if;
end $$;

-- ═══════════════════════════════════════════════════
-- 3) get_student_stats — caller guard + service_role only
-- ═══════════════════════════════════════════════════

create or replace function public.get_student_stats(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_streak integer := 0;
  v_completed integer := 0;
  v_upcoming integer := 0;
  v_questions_total integer := 0;
  v_questions_answered integer := 0;
begin
  if p_user_id is null then
    return json_build_object(
      'streak_days', 0,
      'completed_sessions', 0,
      'enrolled_upcoming', 0,
      'questions_total', 0,
      'questions_answered', 0
    );
  end if;

  if auth.uid() is not null
     and auth.uid() is distinct from p_user_id
     and coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select id, coalesce(streak_days, 0)
  into v_profile_id, v_streak
  from student_profiles
  where user_id = p_user_id;

  if v_profile_id is not null then
    select count(*)::int into v_completed
    from session_enrollments se
    join sessions s on s.id = se.session_id
    where se.student_id = v_profile_id
      and s.status = 'completed';

    select count(*)::int into v_upcoming
    from session_enrollments se
    join sessions s on s.id = se.session_id
    where se.student_id = v_profile_id
      and s.status = 'scheduled'
      and coalesce(s.scheduled_at, s.start_time) >= now();
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'enrollments'
  ) then
    select v_completed + count(*)::int into v_completed
    from enrollments e
    join sessions s on s.id = e.session_id::text
    where e.student_id = p_user_id
      and s.status = 'completed'
      and not exists (
        select 1 from session_enrollments se
        join student_profiles sp on sp.id = se.student_id
        where sp.user_id = p_user_id and se.session_id = s.id
      );

    select v_upcoming + count(*)::int into v_upcoming
    from enrollments e
    join sessions s on s.id = e.session_id::text
    where e.student_id = p_user_id
      and s.status = 'scheduled'
      and coalesce(s.scheduled_at, s.start_time) >= now()
      and not exists (
        select 1 from session_enrollments se
        join student_profiles sp on sp.id = se.student_id
        where sp.user_id = p_user_id and se.session_id = s.id
      );
  end if;

  select count(*)::int into v_questions_total
  from questions
  where student_id = p_user_id;

  select count(*)::int into v_questions_answered
  from questions
  where student_id = p_user_id
    and status = 'answered';

  return json_build_object(
    'streak_days', v_streak,
    'completed_sessions', coalesce(v_completed, 0),
    'enrolled_upcoming', coalesce(v_upcoming, 0),
    'questions_total', coalesce(v_questions_total, 0),
    'questions_answered', coalesce(v_questions_answered, 0)
  );
end;
$$;

revoke all on function public.get_student_stats(uuid) from public;
revoke all on function public.get_student_stats(uuid) from anon, authenticated;
grant execute on function public.get_student_stats(uuid) to service_role;

-- ═══════════════════════════════════════════════════
-- 4) platform_stats — restrict public read to visible rows
-- ═══════════════════════════════════════════════════

drop policy if exists "platform_stats_public_read" on public.platform_stats;
create policy "platform_stats_public_read"
on public.platform_stats for select
to anon, authenticated
using (is_visible = true);

-- ═══════════════════════════════════════════════════
-- 5) avatars bucket — stop API listing; direct URLs still work (bucket is public)
-- ═══════════════════════════════════════════════════

drop policy if exists avatars_public_read on storage.objects;
