-- Peak Academy — Study Room Free Trial
-- Adds: trial columns, trial_fingerprints table, has_room_access() function

-- ═══════════════════════════════════════════════════════════════
-- 1. Extend student_subscriptions for trial support
-- ═══════════════════════════════════════════════════════════════

-- Allow trial rows to have no plan
ALTER TABLE public.student_subscriptions
  ALTER COLUMN plan_id DROP NOT NULL;

-- Trial period columns
ALTER TABLE public.student_subscriptions
  ADD COLUMN IF NOT EXISTS trial_start timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end   timestamptz;

-- Extend status constraint to include trial and free statuses
DO $$ BEGIN
  ALTER TABLE public.student_subscriptions
    DROP CONSTRAINT IF EXISTS student_subscriptions_status_check;
  ALTER TABLE public.student_subscriptions
    ADD CONSTRAINT student_subscriptions_status_check
    CHECK (status IN (
      'free', 'trialing', 'trial_expired',
      'active', 'cancelled', 'expired',
      'paused', 'grace', 'past_due', 'frozen'
    ));
EXCEPTION WHEN others THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. Trial fingerprints — one free trial per email/phone
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.trial_fingerprints (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_hash text        NOT NULL UNIQUE,
  phone_hash text        UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_fp_email
  ON public.trial_fingerprints(email_hash);

CREATE INDEX IF NOT EXISTS idx_trial_fp_phone
  ON public.trial_fingerprints(phone_hash)
  WHERE phone_hash IS NOT NULL;

ALTER TABLE public.trial_fingerprints ENABLE ROW LEVEL SECURITY;

-- Backend-only access (service role bypasses RLS automatically)
DO $$ BEGIN
  CREATE POLICY "trial_fingerprints_deny_all"
    ON public.trial_fingerprints FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. has_room_access() — single source of truth for study room access
--    Teachers: always allowed
--    Students: need an active trial OR active paid subscription
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.has_room_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    -- teachers always have access
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = p_user_id
        AND role = 'teacher'
        AND is_active = true
    )
    OR
    -- active free trial
    EXISTS (
      SELECT 1 FROM public.student_subscriptions
      WHERE student_id = p_user_id
        AND status = 'trialing'
        AND trial_end > now()
    )
    OR
    -- active paid subscription
    EXISTS (
      SELECT 1 FROM public.student_subscriptions
      WHERE student_id = p_user_id
        AND status = 'active'
        AND current_period_end > now()
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_room_access(uuid) TO authenticated;
