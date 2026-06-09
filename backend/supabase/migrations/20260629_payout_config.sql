-- ============================================================
-- 1. Platform config table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_config (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_config (key, value, description) VALUES
  ('session_price',       '80',   'سعر المحاضرة الواحدة بالجنيه'),
  ('platform_commission', '0.30', 'نسبة عمولة المنصة'),
  ('teacher_share',       '0.70', 'نسبة نصيب المدرس'),
  ('payout_day',          '27',   'يوم القبض الشهري'),
  ('payout_calc_day',     '25',   'يوم حساب العمولات'),
  ('payout_window_days',  '2',    'عدد أيام نافذة طلبات السحب'),
  ('min_withdrawal',      '50',   'الحد الأدنى للسحب بالجنيه'),
  ('room_sub_price',      '49',   'سعر اشتراك غرف المذاكرة')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_config" ON public.platform_config;
CREATE POLICY "public_read_config"
  ON public.platform_config FOR SELECT
  USING (true);

-- ============================================================
-- 2. Add payout_month / payout_day to withdrawal_requests
-- ============================================================
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS payout_month text,
  ADD COLUMN IF NOT EXISTS payout_day   int;

-- ============================================================
-- 3. Monthly payouts snapshot table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.monthly_payouts (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id          uuid    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payout_month        text    NOT NULL,
  payout_day          int     NOT NULL DEFAULT 27,

  session_count       int     NOT NULL DEFAULT 0,
  session_gross       numeric(10,2) NOT NULL DEFAULT 0,
  session_teacher_cut numeric(10,2) NOT NULL DEFAULT 0,

  room_student_count  int     NOT NULL DEFAULT 0,
  room_gross          numeric(10,2) NOT NULL DEFAULT 0,
  room_commission     numeric(10,2) NOT NULL DEFAULT 0,

  total_amount        numeric(10,2) NOT NULL DEFAULT 0,
  status              text    NOT NULL DEFAULT 'calculated'
                      CHECK (status IN ('calculated', 'window_open', 'processing', 'paid', 'partial')),

  calculated_at       timestamptz NOT NULL DEFAULT now(),
  window_opened_at    timestamptz,
  paid_at             timestamptz,
  notes               text,

  UNIQUE(teacher_id, payout_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_payouts_month
  ON public.monthly_payouts(payout_month, status);

ALTER TABLE public.monthly_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teachers_see_own_payouts" ON public.monthly_payouts;
CREATE POLICY "teachers_see_own_payouts"
  ON public.monthly_payouts FOR SELECT
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );
