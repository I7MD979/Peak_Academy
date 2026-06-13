-- Peak Academy — Verification security hardening
-- Audit log for document access/review; allow clearing file_path after approval.

-- Audit log for verification document access/review actions
CREATE TABLE IF NOT EXISTS public.verification_audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid        NOT NULL REFERENCES public.verification_documents(id) ON DELETE CASCADE,
  actor_id      uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  action        text        NOT NULL CHECK (action IN ('viewed', 'approved', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_audit_log_document
  ON public.verification_audit_log(document_id);

CREATE INDEX IF NOT EXISTS idx_verification_audit_log_actor
  ON public.verification_audit_log(actor_id);

-- No RLS policies for client access — written/read only via backend service_role.
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

-- After admin approval, file_path is cleared and the Storage object is deleted.
ALTER TABLE public.verification_documents
  ALTER COLUMN file_path DROP NOT NULL;
