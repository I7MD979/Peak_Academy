-- Peak Academy — extended teacher profile fields
alter table public.teacher_profiles
  add column if not exists grades text[] default '{}',
  add column if not exists experience_years int,
  add column if not exists education text,
  add column if not exists social_url text;
