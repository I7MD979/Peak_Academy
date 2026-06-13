-- Fix count_enrollments_by_sessions for schema v1 (session_enrollments) and text session IDs

DROP FUNCTION IF EXISTS public.count_enrollments_by_sessions(uuid[]);

CREATE OR REPLACE FUNCTION public.count_enrollments_by_sessions(session_ids text[])
RETURNS TABLE(session_id text, enrollment_count bigint)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF to_regclass('public.enrollments') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'enrollments'
        AND column_name = 'payment_status'
    )
  THEN
    RETURN QUERY
    SELECT e.session_id::text, COUNT(*)::bigint
    FROM public.enrollments e
    WHERE e.session_id = ANY(session_ids)
      AND e.status IN ('confirmed', 'attended')
    GROUP BY e.session_id;
  ELSIF to_regclass('public.session_enrollments') IS NOT NULL THEN
    RETURN QUERY
    SELECT e.session_id::text, COUNT(*)::bigint
    FROM public.session_enrollments e
    WHERE e.session_id = ANY(session_ids)
      AND e.status IN ('enrolled', 'attended')
    GROUP BY e.session_id;
  END IF;
END;
$$;
