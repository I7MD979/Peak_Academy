-- Allow signed-in users to create their own row in public.users (required for onboarding upsert)

drop policy if exists "users_insert_own_profile" on public.users;
create policy "users_insert_own_profile"
on public.users
for insert
to authenticated
with check (auth.uid() = id);
