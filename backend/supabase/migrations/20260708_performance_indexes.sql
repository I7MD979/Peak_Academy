-- Peak Academy — query performance helpers for hot paths

CREATE INDEX IF NOT EXISTS idx_sessions_status_scheduled_grade
  ON public.sessions (status, scheduled_at, grade);

CREATE INDEX IF NOT EXISTS idx_sessions_status_scheduled_school_level
  ON public.sessions (status, scheduled_at, school_level);

CREATE OR REPLACE FUNCTION public.admin_total_platform_revenue()
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(platform_amount), 0) FROM public.teacher_earnings;
$$;

CREATE OR REPLACE FUNCTION public.count_enrollments_by_sessions(session_ids uuid[])
RETURNS TABLE(session_id uuid, enrollment_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT e.session_id, COUNT(*)::bigint AS enrollment_count
  FROM public.enrollments e
  WHERE e.session_id = ANY(session_ids)
  GROUP BY e.session_id
$$;
