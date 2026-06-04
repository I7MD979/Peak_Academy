-- Study rooms (fixes GET /api/study-rooms)

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

create index if not exists idx_study_rooms_status_subject on public.study_rooms(status, subject);
create index if not exists idx_study_rooms_grade_status on public.study_rooms(grade, status);
create index if not exists idx_study_room_members_room on public.study_room_members(room_id) where left_at is null;
