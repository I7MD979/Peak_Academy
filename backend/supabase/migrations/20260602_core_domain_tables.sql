-- Peak Academy - core domain tables

create table if not exists public.sessions (
  id text primary key,
  teacher_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  subject text not null,
  grade text not null check (grade in ('first', 'second', 'third')),
  scheduled_at timestamptz not null,
  duration_min int not null check (duration_min between 30 and 180),
  max_students int not null check (max_students between 2 and 20),
  price_per_student numeric(10,2) not null check (price_per_student >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  room_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  amount numeric(10,2) not null check (amount >= 0),
  status text not null check (status in ('pending', 'completed', 'failed')),
  gateway_ref text,
  provider text default 'mock',
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id text primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  payment_id text references public.transactions(id) on delete set null,
  status text not null default 'enrolled' check (status in ('enrolled', 'attended', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table if not exists public.questions (
  id text primary key,
  student_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid references public.users(id) on delete set null,
  subject text not null,
  content text not null,
  answer text,
  status text not null default 'unanswered' check (status in ('unanswered', 'answered')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(parent_id, student_id)
);

create table if not exists public.withdrawals (
  id text primary key,
  teacher_id uuid not null references public.users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  actor_id uuid references public.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_teacher_id on public.sessions(teacher_id);
create index if not exists idx_sessions_status_scheduled_at on public.sessions(status, scheduled_at);
create index if not exists idx_enrollments_session_id on public.enrollments(session_id);
create index if not exists idx_enrollments_student_id on public.enrollments(student_id);
create index if not exists idx_transactions_user_status on public.transactions(user_id, status);
create index if not exists idx_questions_status_subject on public.questions(status, subject);
create index if not exists idx_parent_links_parent_id on public.parent_links(parent_id);
create index if not exists idx_audit_logs_actor_created_at on public.audit_logs(actor_id, created_at desc);
create index if not exists idx_audit_logs_action_created_at on public.audit_logs(action, created_at desc);

create table if not exists public.weekly_email_subscriptions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  enabled boolean not null default true,
  day_of_week int not null default 0 check (day_of_week between 0 and 6),
  hour_utc int not null default 7 check (hour_utc between 0 and 23),
  next_send_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(parent_id, student_id)
);

create table if not exists public.parent_reports (
  id text primary key,
  parent_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  mime_type text not null default 'application/pdf',
  storage_key text,
  generated_at timestamptz not null default now()
);

create table if not exists public.study_rooms (
  id text primary key,
  subject text not null,
  grade text not null check (grade in ('first', 'second', 'third')),
  status text not null default 'open' check (status in ('open', 'active', 'closed')),
  capacity int not null default 6 check (capacity between 2 and 12),
  created_at timestamptz not null default now()
);

create table if not exists public.study_room_members (
  id text primary key,
  room_id text not null references public.study_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique(room_id, user_id, joined_at)
);

create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.reviews (
  id text primary key,
  student_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete cascade,
  session_id text references public.sessions(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  teacher_reply text,
  created_at timestamptz not null default now(),
  replied_at timestamptz
);

create index if not exists idx_weekly_email_subscriptions_parent on public.weekly_email_subscriptions(parent_id);
create index if not exists idx_notifications_user_read_created on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_reviews_teacher_created on public.reviews(teacher_id, created_at desc);
create index if not exists idx_study_rooms_status_subject on public.study_rooms(status, subject);

create table if not exists public.question_pricing (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  grade text not null check (grade in ('first', 'second', 'third')),
  amount numeric(10,2) not null check (amount >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_routes (
  id text primary key,
  student_id uuid not null references public.users(id) on delete cascade,
  question_id text references public.questions(id) on delete set null,
  teacher_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'accepted', 'rejected', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.live_quizzes (
  id text primary key,
  teacher_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  subject text not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'finished')),
  starts_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.live_quiz_questions (
  id text primary key,
  quiz_id text not null references public.live_quizzes(id) on delete cascade,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_option text not null
);

create table if not exists public.live_quiz_attempts (
  id text primary key,
  quiz_id text not null references public.live_quizzes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  score int not null default 0,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique(quiz_id, user_id)
);

create table if not exists public.session_recordings (
  id text primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete cascade,
  storage_url text not null,
  visibility text not null default 'enrolled_only' check (visibility in ('enrolled_only', 'public', 'private')),
  created_at timestamptz not null default now()
);

create index if not exists idx_question_pricing_subject_grade on public.question_pricing(subject, grade);
create index if not exists idx_marketplace_routes_teacher_status on public.marketplace_routes(teacher_id, status);
create index if not exists idx_live_quizzes_teacher_status on public.live_quizzes(teacher_id, status);
create index if not exists idx_live_quiz_attempts_quiz_submitted on public.live_quiz_attempts(quiz_id, submitted_at desc);
create index if not exists idx_session_recordings_session on public.session_recordings(session_id);
