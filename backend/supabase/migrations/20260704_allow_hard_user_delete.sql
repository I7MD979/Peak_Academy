-- Peak Academy — allow hard delete of users (auth.users + public.users cascade)
-- Fixes FK constraints without ON DELETE that would block admin.deleteUser():
--   - study_room_voice_sessions.started_by -> SET NULL on user delete
--   - admin_permissions.granted_by         -> SET NULL on user delete

-- ═══════════════════════════════════════════════════════════════
-- 1. study_room_voice_sessions.started_by
--    Make nullable + ON DELETE SET NULL (preserve session row)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.study_room_voice_sessions
  ALTER COLUMN started_by DROP NOT NULL;

ALTER TABLE public.study_room_voice_sessions
  DROP CONSTRAINT IF EXISTS study_room_voice_sessions_started_by_fkey;

ALTER TABLE public.study_room_voice_sessions
  ADD CONSTRAINT study_room_voice_sessions_started_by_fkey
  FOREIGN KEY (started_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════
-- 2. admin_permissions.granted_by
--    Already nullable; switch to ON DELETE SET NULL
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.admin_permissions
  DROP CONSTRAINT IF EXISTS admin_permissions_granted_by_fkey;

ALTER TABLE public.admin_permissions
  ADD CONSTRAINT admin_permissions_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE SET NULL;
