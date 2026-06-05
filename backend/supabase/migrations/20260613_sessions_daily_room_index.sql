-- Peak Academy — Daily.co room idempotency columns + index

alter table public.sessions
  add column if not exists daily_room_name text,
  add column if not exists daily_room_url text;

create unique index if not exists idx_sessions_daily_room_name
  on public.sessions (daily_room_name)
  where daily_room_name is not null;
