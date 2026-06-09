-- Peak Academy — Comprehensive Fix Migration
-- Safe to run multiple times: uses IF NOT EXISTS + DO $$ EXCEPTION blocks
-- Run this AFTER all previous migrations

-- ============================================================
-- FIX 1: Add trialing + trial_expired to subscription status
-- ============================================================
DO $$
BEGIN
  ALTER TABLE public.student_subscriptions
    DROP CONSTRAINT IF EXISTS student_subscriptions_status_check;

  ALTER TABLE public.student_subscriptions
    ADD CONSTRAINT student_subscriptions_status_check
    CHECK (status IN (
      'active', 'cancelled', 'expired',
      'paused', 'grace', 'past_due', 'frozen',
      'trialing', 'trial_expired', 'free'
    ));
EXCEPTION WHEN others THEN
  RAISE NOTICE 'status constraint update skipped: %', SQLERRM;
END $$;

-- ============================================================
-- FIX 2: Make plan_id nullable (required for free trials)
-- ============================================================
ALTER TABLE public.student_subscriptions
  ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE public.student_subscriptions
  ADD COLUMN IF NOT EXISTS trial_start timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end   timestamptz;

-- ============================================================
-- FIX 3: has_room_access() function
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_room_access(p_user_id uuid)
RETURNS boolean AS $$
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
        (ss.status = 'trialing' AND ss.trial_end        > now())
        OR
        (ss.status = 'active'   AND ss.current_period_end > now())
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.has_room_access(uuid) TO authenticated;

-- ============================================================
-- FIX 4: trial_fingerprints table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trial_fingerprints (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_hash  text        NOT NULL UNIQUE,
  phone_hash  text        UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_fp_email
  ON public.trial_fingerprints(email_hash);
CREATE INDEX IF NOT EXISTS idx_trial_fp_phone
  ON public.trial_fingerprints(phone_hash) WHERE phone_hash IS NOT NULL;

ALTER TABLE public.trial_fingerprints ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_only_fingerprints"
    ON public.trial_fingerprints FOR ALL
    USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- FIX 5: teacher_id on study_rooms
-- ============================================================
ALTER TABLE public.study_rooms
  ADD COLUMN IF NOT EXISTS teacher_id uuid
  REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_rooms_teacher
  ON public.study_rooms(teacher_id) WHERE teacher_id IS NOT NULL;

-- ============================================================
-- FIX 6: role column on study_room_members
-- ============================================================
ALTER TABLE public.study_room_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student'
  CHECK (role IN ('owner', 'ta', 'student', 'moderator'));

-- ============================================================
-- FIX 7: study_room_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_room_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     text        NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel     text        NOT NULL DEFAULT 'general'
              CHECK (channel IN ('general', 'qa')),
  type        text        NOT NULL DEFAULT 'text'
              CHECK (type IN ('text', 'image', 'voice_note', 'question', 'official_reply')),
  content     text,
  voice_url   text,
  image_url   text,
  reply_to    uuid        REFERENCES public.study_room_messages(id) ON DELETE SET NULL,
  is_resolved boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_has_content
    CHECK (content IS NOT NULL OR voice_url IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room_channel
  ON public.study_room_messages(room_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_messages_reply_to
  ON public.study_room_messages(reply_to) WHERE reply_to IS NOT NULL;

ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "room_members_read_messages"
    ON public.study_room_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.study_room_members srm
        WHERE srm.room_id = study_room_messages.room_id
          AND srm.user_id = auth.uid()
          AND srm.left_at IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "room_members_send_messages"
    ON public.study_room_messages FOR INSERT
    WITH CHECK (
      sender_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.study_room_members srm
        WHERE srm.room_id = study_room_messages.room_id
          AND srm.user_id = auth.uid()
          AND srm.left_at IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- FIX 8: voice sessions + raise hand queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_room_voice_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          text        NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  started_by       uuid        NOT NULL REFERENCES public.users(id),
  livekit_room_id  text        NOT NULL UNIQUE,
  status           text        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'ended')),
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_room
  ON public.study_room_voice_sessions(room_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.raise_hand_queue (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES public.study_room_voice_sessions(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'waiting'
               CHECK (status IN ('waiting', 'granted', 'dismissed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- ============================================================
-- FIX 9: subscription_attributions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_attributions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id uuid        NOT NULL REFERENCES public.student_subscriptions(id) ON DELETE CASCADE,
  room_id         text        REFERENCES public.study_rooms(id) ON DELETE SET NULL,
  attributed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_attributions_teacher
  ON public.subscription_attributions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attributions_student
  ON public.subscription_attributions(student_id);

ALTER TABLE public.subscription_attributions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "teachers_see_own_attributions"
    ON public.subscription_attributions FOR SELECT
    USING (
      teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- FIX 10: room_commission_earnings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_commission_earnings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_month      text        NOT NULL,
  student_count     int         NOT NULL DEFAULT 0,
  gross_amount      numeric(10,2) NOT NULL DEFAULT 0,
  commission_rate   numeric(4,2)  NOT NULL DEFAULT 0.30,
  commission_amount numeric(10,2) NOT NULL DEFAULT 0,
  status            text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'paid')),
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_room_earnings_teacher_month
  ON public.room_commission_earnings(teacher_id, period_month);

ALTER TABLE public.room_commission_earnings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "teachers_see_own_room_earnings"
    ON public.room_commission_earnings FOR SELECT
    USING (
      teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admins_update_room_earnings"
    ON public.room_commission_earnings FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- FIX 11: get_student_latest_room_teacher function
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_student_latest_room_teacher(
  p_student_id   uuid,
  p_window_hours int DEFAULT 24
)
RETURNS uuid AS $$
  SELECT sr.teacher_id
  FROM   public.study_room_members srm
  JOIN   public.study_rooms sr ON sr.id = srm.room_id
  WHERE  srm.user_id = p_student_id
    AND  srm.joined_at > now() - (p_window_hours || ' hours')::interval
    AND  sr.teacher_id IS NOT NULL
    AND  sr.teacher_id <> p_student_id
  ORDER  BY srm.joined_at DESC
  LIMIT  1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_student_latest_room_teacher(uuid, int) TO authenticated;

-- ============================================================
-- Enable Realtime
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_messages;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Realtime for study_room_messages skipped: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.raise_hand_queue;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Realtime for raise_hand_queue skipped: %', SQLERRM;
END $$;
