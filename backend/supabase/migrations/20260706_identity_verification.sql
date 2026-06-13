-- Peak Academy — Identity Verification System
-- Students: optional ID upload -> "pending review" badge until admin approves.
-- Teachers: mandatory national-ID / syndicate-card upload -> "pending_review"
--           status, blocks teaching actions until admin approves.

-- ═══════════════════════════════════════════════════════════════
-- 1. verification_status on users
--    'unverified'      -> default for new accounts (no docs submitted)
--    'pending_review'  -> docs submitted, awaiting admin decision
--    'verified'        -> approved by admin
--    'rejected'        -> rejected by admin (can resubmit -> pending_review)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_verification_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_verification_status_check
  CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected'));

-- Existing rows: keep current is_verified meaning consistent
-- (teachers previously marked id_verified=true stay 'verified')
UPDATE public.users u
SET verification_status = 'verified'
WHERE u.role = 'teacher'
  AND EXISTS (
    SELECT 1 FROM public.teacher_profiles tp
    WHERE tp.user_id = u.id AND tp.id_verified = true
  )
  AND u.verification_status = 'unverified';

-- ═══════════════════════════════════════════════════════════════
-- 2. verification_documents table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.verification_documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doc_type     text        NOT NULL CHECK (doc_type IN ('student_id', 'national_id', 'syndicate_card')),
  file_path    text        NOT NULL, -- path inside 'verification-docs' bucket
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  reject_reason text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_documents_user
  ON public.verification_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_verification_documents_status
  ON public.verification_documents(status)
  WHERE status = 'pending';

-- RLS: users can see/insert their own docs; only service_role (backend) manages review
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS verification_documents_owner_select ON public.verification_documents;
CREATE POLICY verification_documents_owner_select ON public.verification_documents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS verification_documents_owner_insert ON public.verification_documents;
CREATE POLICY verification_documents_owner_insert ON public.verification_documents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- 3. Storage bucket: verification-docs (PRIVATE — sensitive PII)
--    10MB limit, images + PDF only
-- ═══════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-docs',
  'verification-docs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Users can upload only to their own folder: verification-docs/<user_id>/<file>
DROP POLICY IF EXISTS verification_docs_owner_upload ON storage.objects;
CREATE POLICY verification_docs_owner_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own uploaded docs (e.g. to confirm what was submitted)
DROP POLICY IF EXISTS verification_docs_owner_read ON storage.objects;
CREATE POLICY verification_docs_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- No public read policy — admin access goes through service_role (backend),
-- which bypasses RLS entirely and can generate signed URLs.
