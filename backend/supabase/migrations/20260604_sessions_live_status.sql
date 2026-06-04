-- Allow sessions.status = 'live' (required for start/join live session flows)
alter table public.sessions drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('scheduled', 'live', 'cancelled', 'completed'));
