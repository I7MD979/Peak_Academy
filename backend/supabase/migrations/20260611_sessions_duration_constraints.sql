-- Peak Academy: sessions status (live) + duration 15–240 min
-- Apply via: supabase db push (linked project) — not the SQL Editor if you get 42501

alter table public.sessions drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('scheduled', 'live', 'cancelled', 'completed'));

alter table public.sessions drop constraint if exists sessions_duration_min_check;

alter table public.sessions
  add constraint sessions_duration_min_check
  check (duration_min between 15 and 240);
