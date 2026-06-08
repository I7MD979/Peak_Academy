-- Peak Academy — Data-driven RBAC (inspired by MakerKit's permission model)
-- Adds: app_permissions enum, role_permissions table, has_permission() function.
-- Replaces scattered `role = 'admin'` hardcodes in RLS with a single call site.

-- ═══════════════════════════════════════════════════
-- 1. Permissions enum — all valid permission strings
-- ═══════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE public.app_permissions AS ENUM (
    -- admin
    'admin.all',
    'users.manage',
    'teachers.manage',
    'students.manage',
    'sessions.manage',
    'billing.manage',
    'content.manage',
    'subscriptions.manage',
    'reports.view',
    -- teacher
    'sessions.create',
    'sessions.teach',
    'questions.answer',
    'earnings.view',
    -- student / parent
    'questions.ask',
    'child.view'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- 2. role_permissions — maps each role to its permissions
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id          bigserial PRIMARY KEY,
  role        text                   NOT NULL
                CHECK (role IN ('student','teacher','parent','admin')),
  permission  public.app_permissions NOT NULL,
  UNIQUE (role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_public_read" ON public.role_permissions;
CREATE POLICY "role_permissions_public_read"
  ON public.role_permissions FOR SELECT
  TO anon, authenticated
  USING (true);

-- ═══════════════════════════════════════════════════
-- 3. Seed permissions per role
-- ═══════════════════════════════════════════════════

INSERT INTO public.role_permissions (role, permission) VALUES
  -- Admin — full access
  ('admin', 'admin.all'),
  ('admin', 'users.manage'),
  ('admin', 'teachers.manage'),
  ('admin', 'students.manage'),
  ('admin', 'sessions.manage'),
  ('admin', 'billing.manage'),
  ('admin', 'content.manage'),
  ('admin', 'subscriptions.manage'),
  ('admin', 'reports.view'),
  ('admin', 'questions.answer'),
  -- Teacher — own sessions + student comms
  ('teacher', 'sessions.create'),
  ('teacher', 'sessions.teach'),
  ('teacher', 'questions.answer'),
  ('teacher', 'reports.view'),
  ('teacher', 'earnings.view'),
  -- Student
  ('student', 'questions.ask'),
  -- Parent
  ('parent', 'reports.view'),
  ('parent', 'child.view')
ON CONFLICT (role, permission) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 4. has_permission(user_id, permission) → bool
--    Used inside RLS policies (SECURITY DEFINER avoids recursion on users table)
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id   uuid,
  _permission public.app_permissions
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.users        u
    JOIN   public.role_permissions rp ON rp.role = u.role
    WHERE  u.id        = _user_id
      AND  u.is_active = true
      AND  rp.permission = _permission
  );
$$;

REVOKE ALL   ON FUNCTION public.has_permission(uuid, public.app_permissions) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.has_permission(uuid, public.app_permissions) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════
-- 5. has_any_role(user_id, role, ...) → bool
--    Convenience helper for simple role checks in RLS
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.has_any_role(
  _user_id uuid,
  VARIADIC _roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE  id        = _user_id
      AND  role      = ANY(_roles)
      AND  is_active = true
  );
$$;

REVOKE ALL   ON FUNCTION public.has_any_role(uuid, text[]) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════
-- 6. Update key RLS policies to use has_permission()
-- ═══════════════════════════════════════════════════

-- users: admins can read any user row (self-read policy already exists)
DROP POLICY IF EXISTS "users_admin_read" ON public.users;
CREATE POLICY "users_admin_read"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'users.manage'));

-- users: admins can update any user row (self-update policy already exists)
DROP POLICY IF EXISTS "users_admin_update" ON public.users;
CREATE POLICY "users_admin_update"
  ON public.users FOR UPDATE
  TO authenticated
  USING  (public.has_permission(auth.uid(), 'users.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'users.manage'));

-- payments: admins can read all payments (self-read policy already exists)
DROP POLICY IF EXISTS "payments_admin_read" ON public.payments;
CREATE POLICY "payments_admin_read"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'billing.manage'));

DO $$ BEGIN
  -- enrollments: admins can read all (self-read policy already exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'enrollments') THEN
    DROP POLICY IF EXISTS "enrollments_admin_read" ON public.enrollments;
    CREATE POLICY "enrollments_admin_read"
      ON public.enrollments FOR SELECT
      TO authenticated
      USING (public.has_permission(auth.uid(), 'sessions.manage'));
  END IF;

  -- student_subscriptions: admins can manage
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_subscriptions') THEN
    DROP POLICY IF EXISTS "subscriptions_admin_all" ON public.student_subscriptions;
    CREATE POLICY "subscriptions_admin_all"
      ON public.student_subscriptions FOR ALL
      TO authenticated
      USING  (public.has_permission(auth.uid(), 'subscriptions.manage'))
      WITH CHECK (public.has_permission(auth.uid(), 'subscriptions.manage'));
  END IF;

  -- platform_stats: use has_permission instead of raw role check
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_stats') THEN
    DROP POLICY IF EXISTS "platform_stats_admin_write" ON public.platform_stats;
    CREATE POLICY "platform_stats_admin_write"
      ON public.platform_stats FOR ALL
      TO authenticated
      USING  (public.has_permission(auth.uid(), 'content.manage'))
      WITH CHECK (public.has_permission(auth.uid(), 'content.manage'));
  END IF;

  -- sessions: teachers can insert their own sessions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
    DROP POLICY IF EXISTS "sessions_teacher_insert" ON public.sessions;
    CREATE POLICY "sessions_teacher_insert"
      ON public.sessions FOR INSERT
      TO authenticated
      WITH CHECK (
        teacher_id = auth.uid()
        AND public.has_permission(auth.uid(), 'sessions.create')
      );

    DROP POLICY IF EXISTS "sessions_teacher_manage" ON public.sessions;
    CREATE POLICY "sessions_teacher_manage"
      ON public.sessions FOR ALL
      TO authenticated
      USING (
        teacher_id = auth.uid()
        AND public.has_permission(auth.uid(), 'sessions.teach')
      )
      WITH CHECK (
        teacher_id = auth.uid()
        AND public.has_permission(auth.uid(), 'sessions.teach')
      );

    DROP POLICY IF EXISTS "sessions_admin_all" ON public.sessions;
    CREATE POLICY "sessions_admin_all"
      ON public.sessions FOR ALL
      TO authenticated
      USING  (public.has_permission(auth.uid(), 'sessions.manage'))
      WITH CHECK (public.has_permission(auth.uid(), 'sessions.manage'));
  END IF;

  -- questions: teachers can read + answer
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'questions') THEN
    DROP POLICY IF EXISTS "questions_teacher_read" ON public.questions;
    CREATE POLICY "questions_teacher_read"
      ON public.questions FOR SELECT
      TO authenticated
      USING (
        teacher_id = auth.uid()
        AND public.has_permission(auth.uid(), 'questions.answer')
      );

    DROP POLICY IF EXISTS "questions_teacher_answer" ON public.questions;
    CREATE POLICY "questions_teacher_answer"
      ON public.questions FOR UPDATE
      TO authenticated
      USING (
        teacher_id = auth.uid()
        AND public.has_permission(auth.uid(), 'questions.answer')
      )
      WITH CHECK (
        teacher_id = auth.uid()
        AND public.has_permission(auth.uid(), 'questions.answer')
      );
  END IF;

  -- audit_logs: own rows + admin
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
    CREATE POLICY "audit_logs_select_own"
      ON public.audit_logs FOR SELECT
      TO authenticated
      USING (
        actor_id = auth.uid()
        OR public.has_permission(auth.uid(), 'admin.all')
      );
  END IF;

  -- saas_config: admin only
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saas_config') THEN
    DROP POLICY IF EXISTS "saas_config_admin_read" ON public.saas_config;
    CREATE POLICY "saas_config_admin_read"
      ON public.saas_config FOR SELECT
      TO authenticated
      USING (public.has_permission(auth.uid(), 'admin.all'));
  END IF;
END $$;
