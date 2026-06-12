-- Record user consent to terms & privacy policy at registration

alter table public.users
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists terms_accepted_ip text;
