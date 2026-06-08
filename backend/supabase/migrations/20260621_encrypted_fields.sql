-- Field-level encryption support (phone search hash)

alter table public.users
  add column if not exists phone_hash text,
  add column if not exists national_id text;

create index if not exists idx_users_phone_hash on public.users(phone_hash);
