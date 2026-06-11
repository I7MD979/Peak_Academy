-- Remove seeded demo records (run setup-super-admin.mjs for auth user setup)
-- Safe across schemas that use session_enrollments and/or enrollments.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'study_room_messages'
  ) then
    delete from public.study_room_messages
    where room_id in ('demo-room-math-third', 'demo-room-physics-third');
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'study_room_members'
  ) then
    delete from public.study_room_members
    where room_id in ('demo-room-math-third', 'demo-room-physics-third')
       or id = 'demo-member-student-math';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'study_rooms'
  ) then
    delete from public.study_rooms
    where id in ('demo-room-math-third', 'demo-room-physics-third');
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'session_enrollments'
  ) then
    delete from public.session_enrollments
    where id in ('demo-enr-scheduled', 'demo-enr-completed')
       or session_id in (
         'a1000001-0000-4000-8000-000000000001',
         'a1000002-0000-4000-8000-000000000002'
       );
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'enrollments'
  ) then
    delete from public.enrollments
    where legacy_enrollment_id in ('demo-enr-scheduled', 'demo-enr-completed')
       or session_id in (
         'a1000001-0000-4000-8000-000000000001',
         'a1000002-0000-4000-8000-000000000002'
       );
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'sessions'
  ) then
    delete from public.sessions
    where id in (
      'a1000001-0000-4000-8000-000000000001',
      'a1000002-0000-4000-8000-000000000002'
    );
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'questions'
  ) then
    delete from public.questions
    where id in ('demo-question-open', 'demo-question-answered');
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'withdrawals'
  ) then
    delete from public.withdrawals where id = 'demo-withdrawal-001';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'withdrawal_requests'
  ) then
    delete from public.withdrawal_requests where id = 'demo-withdrawal-001';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'promotions'
  ) then
    delete from public.promotions where code = 'DEMO20';
  end if;
end $$;
