-- Student Q&A questions (fixes GET /api/questions/overview)

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

create index if not exists idx_questions_status_subject on public.questions(status, subject);
create index if not exists idx_questions_student_created on public.questions(student_id, created_at desc);
