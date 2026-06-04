-- Peak Academy — Phase 1C: optional UUID session mapping (run after 20260609)
-- Keeps TEXT sessions.id for compatibility; adds mapping for new UUID-first clients.
-- If you see "column start_time does not exist", run 20260609_master_schema_v2.sql first,
-- or rely on the ALTERs below (idempotent).

alter table public.sessions add column if not exists start_time timestamptz;
alter table public.sessions add column if not exists duration_minutes int;
alter table public.sessions add column if not exists price numeric(10,2);
alter table public.sessions add column if not exists current_students int not null default 0;
alter table public.sessions add column if not exists daily_room_name text;
alter table public.sessions add column if not exists recording_url text;
alter table public.sessions add column if not exists description text;
alter table public.sessions add column if not exists subject_id uuid;
alter table public.sessions add column if not exists daily_room_url text;

update public.sessions set
  start_time = coalesce(start_time, scheduled_at),
  duration_minutes = coalesce(duration_minutes, duration_min),
  price = coalesce(price, price_per_student)
where scheduled_at is not null
  and (start_time is null or duration_minutes is null or price is null);

create table if not exists public.session_id_map (
  legacy_id text primary key references public.sessions(id) on delete cascade,
  uuid_id uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

insert into public.session_id_map (legacy_id)
select id from public.sessions s
where not exists (select 1 from public.session_id_map m where m.legacy_id = s.id)
on conflict do nothing;

-- View for RULE 2 UUID-shaped session reads
create or replace view public.sessions_v2 as
select
  m.uuid_id as id,
  s.teacher_id,
  s.subject_id,
  s.title,
  s.description,
  coalesce(s.start_time, s.scheduled_at) as start_time,
  coalesce(s.duration_minutes, s.duration_min) as duration_minutes,
  s.max_students,
  coalesce(s.current_students, 0) as current_students,
  coalesce(s.price, s.price_per_student) as price,
  s.daily_room_url,
  s.daily_room_name,
  s.status,
  s.recording_url,
  s.created_at,
  m.legacy_id
from public.sessions s
join public.session_id_map m on m.legacy_id = s.id;
