-- Notifications + question pricing (fixes /api/notifications and /api/questions/overview)

create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_user_read_created
  on public.notifications(user_id, is_read, created_at desc);

alter table if exists public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.question_pricing (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  grade text not null check (grade in ('first', 'second', 'third')),
  amount numeric(10,2) not null check (amount >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (subject, grade)
);

create index if not exists idx_question_pricing_subject_grade
  on public.question_pricing(subject, grade);

insert into public.question_pricing (subject, grade, amount)
select s.subject, g.grade, 18.00
from (
  values
    ('math'), ('physics'), ('chemistry'), ('biology'),
    ('arabic'), ('english'), ('history'), ('geography')
) as s(subject),
(
  values ('first'), ('second'), ('third')
) as g(grade)
on conflict (subject, grade) do nothing;
