-- 20260626_staff_permissions.sql
-- Add supervisor role and admin permissions management table

-- Safely update role CHECK constraint to include 'supervisor'
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT constraint_name INTO v_constraint
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND constraint_type = 'CHECK'
    AND constraint_name ILIKE '%role%'
  LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', v_constraint);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'teacher', 'parent', 'admin', 'supervisor'));

-- Per-user permission overrides for supervisor accounts
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  user_id     uuid        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  permissions text[]      NOT NULL DEFAULT '{}',
  granted_by  uuid        REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Admins have full access to manage all permissions
CREATE POLICY "adm_perms_admin_all"
  ON public.admin_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
    )
  );

-- Supervisors can read their own permissions row
CREATE POLICY "adm_perms_self_read"
  ON public.admin_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER admin_permissions_touch_updated_at
    BEFORE UPDATE ON public.admin_permissions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for fast supervisor lookups
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON public.admin_permissions(user_id);
