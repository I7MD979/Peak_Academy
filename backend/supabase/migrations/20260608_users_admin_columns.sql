-- Add columns required by the admin user-management boilerplate.
-- Must be run before the new /admin/users/* endpoints work correctly.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill updated_at for existing rows so it's never NULL
UPDATE public.users
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Ensure saas_features columns also exist (safe if 20260620_saas_features already ran)
ALTER TABLE public.student_subscriptions
  ADD COLUMN IF NOT EXISTS frozen_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS frozen_until  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freeze_count  INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freeze_reason TEXT;
