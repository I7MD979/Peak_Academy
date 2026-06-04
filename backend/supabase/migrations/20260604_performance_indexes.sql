-- Peak Academy - performance indexes (system design alignment)

create index if not exists idx_sessions_subject_id_scheduled_at
  on public.sessions(subject_id, scheduled_at desc)
  where subject_id is not null;

create index if not exists idx_sessions_scheduled_at
  on public.sessions(scheduled_at desc);

create index if not exists idx_session_enrollments_student_status
  on public.session_enrollments(student_id, status);

create index if not exists idx_session_enrollments_session_status
  on public.session_enrollments(session_id, status);

create index if not exists idx_transactions_user_created_at
  on public.transactions(user_id, created_at desc);

create index if not exists idx_transactions_status_created_at
  on public.transactions(status, created_at desc);

create index if not exists idx_withdrawal_requests_teacher_status
  on public.withdrawal_requests(teacher_id, status);

create index if not exists idx_teacher_earnings_teacher_created
  on public.teacher_earnings(teacher_id, created_at desc);
