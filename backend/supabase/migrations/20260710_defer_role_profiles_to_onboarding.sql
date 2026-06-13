-- Peak Academy — defer role profiles to onboarding (setup-profile)
-- After hard delete + re-register, users must complete onboarding again.
-- Previously handle_new_user() auto-created student_profiles/teacher_profiles with defaults.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1),
    'مستخدم جديد'
  );

  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    v_name,
    new.raw_user_meta_data->>'avatar_url',
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  -- student_profiles / teacher_profiles are created in POST /auth/setup-profile only.
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
