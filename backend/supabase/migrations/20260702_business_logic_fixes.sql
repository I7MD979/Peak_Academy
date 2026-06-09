-- Business logic hardening: atomic seats, subscription uniqueness, session deduct

-- One active/trialing/grace/frozen subscription per student
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_subscriptions_one_live
  ON public.student_subscriptions (student_id)
  WHERE status IN ('active', 'trialing', 'grace', 'frozen');

-- Atomic seat reservation (returns true when a seat was reserved)
CREATE OR REPLACE FUNCTION public.reserve_session_seat(p_session_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated integer;
BEGIN
  UPDATE public.sessions
  SET current_students = COALESCE(current_students, 0) + 1
  WHERE id = p_session_id
    AND status = 'scheduled'
    AND (
      max_students IS NULL
      OR max_students = 0
      OR COALESCE(current_students, 0) < max_students
    );

  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

-- Release a seat when enrollment is cancelled/refunded
CREATE OR REPLACE FUNCTION public.decrement_session_count(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sessions
  SET current_students = GREATEST(COALESCE(current_students, 0) - 1, 0)
  WHERE id = p_session_id;
END;
$$;

-- Atomic subscription session deduction
CREATE OR REPLACE FUNCTION public.deduct_subscription_session(p_sub_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_remaining integer;
BEGIN
  UPDATE public.student_subscriptions
  SET sessions_remaining = sessions_remaining - 1
  WHERE id = p_sub_id
    AND status = 'active'
    AND sessions_remaining > 0
  RETURNING sessions_remaining INTO new_remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no sessions remaining';
  END IF;

  RETURN new_remaining;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_session_seat(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_session_count(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_subscription_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_session_seat(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_session_count(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_subscription_session(uuid) TO service_role;
