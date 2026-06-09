-- Peak Academy — Fix Function Security Warnings
-- Fixes:
--   1. Function Search Path Mutable → SET search_path = public
--   2. Public Can Execute SECURITY DEFINER → REVOKE FROM PUBLIC, GRANT TO authenticated only

-- ============================================================
-- Fix: has_room_access
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_room_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = p_user_id
      AND u.role = 'teacher'
      AND u.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.student_subscriptions ss
    WHERE ss.student_id = p_user_id
      AND ss.status IN ('active', 'trialing')
      AND (
        (ss.status = 'trialing' AND ss.trial_end          > now())
        OR
        (ss.status = 'active'   AND ss.current_period_end > now())
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_room_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_room_access(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.has_room_access(uuid) TO authenticated;

-- ============================================================
-- Fix: get_student_latest_room_teacher
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_student_latest_room_teacher(
  p_student_id   uuid,
  p_window_hours int DEFAULT 24
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.teacher_id
  FROM   public.study_room_members srm
  JOIN   public.study_rooms sr ON sr.id = srm.room_id
  WHERE  srm.user_id = p_student_id
    AND  srm.joined_at > now() - (p_window_hours || ' hours')::interval
    AND  sr.teacher_id IS NOT NULL
    AND  sr.teacher_id <> p_student_id
  ORDER  BY srm.joined_at DESC
  LIMIT  1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_student_latest_room_teacher(uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_latest_room_teacher(uuid, int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_student_latest_room_teacher(uuid, int) TO authenticated;
