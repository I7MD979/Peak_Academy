-- expires_at for raise_hand_queue (BUG-09 — crash-safe grant revoke)
ALTER TABLE public.raise_hand_queue
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_raise_hand_active
  ON public.raise_hand_queue(session_id, status)
  WHERE status IN ('waiting', 'granted');

CREATE INDEX IF NOT EXISTS idx_attribution_subscription
  ON public.subscription_attributions(subscription_id);

CREATE INDEX IF NOT EXISTS idx_room_commission_month
  ON public.room_commission_earnings(period_month, status);

CREATE INDEX IF NOT EXISTS idx_teacher_earnings_teacher_status
  ON public.teacher_earnings(teacher_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_withdrawal_payout_month
  ON public.withdrawal_requests(teacher_id, payout_month, status);
