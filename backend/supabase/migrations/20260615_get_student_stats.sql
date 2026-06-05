-- Student dashboard/profile stats RPC

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

grant execute on function public.get_student_stats(uuid) to authenticated, service_role;
