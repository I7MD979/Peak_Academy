-- Peak Academy — Study Rooms: Unify channels into one room + file attachments
-- 1. Relax channel constraint (general/qa -> single 'main' channel going forward)
-- 2. Allow 'file' message type
-- 3. Add file metadata columns
-- 4. New storage bucket for room file uploads (10MB limit)

-- ═══════════════════════════════════════════════════════════════
-- 1. Channel constraint: drop the general/qa restriction
--    (existing rows keep their values; new messages should use 'main')
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.study_room_messages
  DROP CONSTRAINT IF EXISTS study_room_messages_channel_check;

ALTER TABLE public.study_room_messages
  ADD CONSTRAINT study_room_messages_channel_check
  CHECK (channel IN ('general', 'qa', 'main'));

ALTER TABLE public.study_room_messages
  ALTER COLUMN channel SET DEFAULT 'main';

-- ═══════════════════════════════════════════════════════════════
-- 2. Add 'file' message type
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.study_room_messages
  DROP CONSTRAINT IF EXISTS study_room_messages_type_check;

ALTER TABLE public.study_room_messages
  ADD CONSTRAINT study_room_messages_type_check
  CHECK (type IN ('text', 'image', 'voice_note', 'question', 'official_reply', 'file'));

-- ═══════════════════════════════════════════════════════════════
-- 3. File metadata columns
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.study_room_messages
  ADD COLUMN IF NOT EXISTS file_url  text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_type text;

-- Allow messages whose only content is a file
ALTER TABLE public.study_room_messages
  DROP CONSTRAINT IF EXISTS message_has_content;

ALTER TABLE public.study_room_messages
  ADD CONSTRAINT message_has_content CHECK (
    content IS NOT NULL OR voice_url IS NOT NULL
    OR image_url IS NOT NULL OR file_url IS NOT NULL
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. Storage bucket: study-room-files (10MB limit, common doc/image types)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-room-files',
  'study-room-files',
  true,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read (links shared in chat can be opened by anyone with the URL)
DROP POLICY IF EXISTS study_room_files_public_read ON storage.objects;
CREATE POLICY study_room_files_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'study-room-files');

-- Only active room members can upload, under a folder named after the room id:
-- study-room-files/<room_id>/<filename>
DROP POLICY IF EXISTS study_room_files_member_upload ON storage.objects;
CREATE POLICY study_room_files_member_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'study-room-files'
    AND EXISTS (
      SELECT 1 FROM public.study_room_members
      WHERE room_id = (storage.foldername(name))[1]
        AND user_id = auth.uid()
        AND left_at IS NULL
    )
  );

-- Uploader can delete their own files
DROP POLICY IF EXISTS study_room_files_owner_delete ON storage.objects;
CREATE POLICY study_room_files_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'study-room-files'
    AND owner = auth.uid()
  );
