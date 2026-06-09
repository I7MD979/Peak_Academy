-- Peak Academy — Teacher Room Commission System
-- Adds: teacher_id on study_rooms, subscription_attributions, room_commission_earnings

-- ============================================================
-- 1. ربط المدرس بالغرفة
-- ============================================================
ALTER TABLE public.study_rooms
  ADD COLUMN IF NOT EXISTS teacher_id uuid
  REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_rooms_teacher
  ON public.study_rooms(teacher_id) WHERE teacher_id IS NOT NULL;

-- ============================================================
-- 2. Attribution table — مين اشترك بسبب مين
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_attributions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id uuid        NOT NULL REFERENCES public.student_subscriptions(id) ON DELETE CASCADE,
  room_id         text        REFERENCES public.study_rooms(id) ON DELETE SET NULL,
  attributed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subscription_id)  -- اشتراك واحد = attribution واحد فقط
);

CREATE INDEX IF NOT EXISTS idx_attributions_teacher
  ON public.subscription_attributions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attributions_student
  ON public.subscription_attributions(student_id);

-- RLS
ALTER TABLE public.subscription_attributions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "teachers see their own attributions"
    ON public.subscription_attributions FOR SELECT
    USING (
      teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'moderator')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. Room commission earnings — منفصل عن session earnings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_commission_earnings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_month      text        NOT NULL,           -- '2026-06'
  student_count     int         NOT NULL DEFAULT 0,
  gross_amount      numeric(10,2) NOT NULL DEFAULT 0,    -- إجمالي اشتراكات الطلاب
  commission_rate   numeric(4,2)  NOT NULL DEFAULT 0.30,
  commission_amount numeric(10,2) NOT NULL DEFAULT 0,    -- gross × rate
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
  CREATE POLICY "teachers see own room earnings"
    ON public.room_commission_earnings FOR SELECT
    USING (
      teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'moderator')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admins can update status
DO $$ BEGIN
  CREATE POLICY "admins update room earnings"
    ON public.room_commission_earnings FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 4. Function: get teacher's latest room in last 24h
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
    AND  sr.teacher_id <> p_student_id   -- المدرس مش بيحسب على نفسه
  ORDER  BY srm.joined_at DESC
  LIMIT  1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_student_latest_room_teacher(uuid, int) TO authenticated;
