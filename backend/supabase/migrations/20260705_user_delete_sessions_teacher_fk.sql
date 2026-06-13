-- Peak Academy — sessions.teacher_id blocked teacher hard-delete (ON DELETE RESTRICT)
-- Preserve session rows; drop teacher link when the teacher account is removed.

ALTER TABLE public.sessions
  ALTER COLUMN teacher_id DROP NOT NULL;

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_teacher_id_fkey;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE SET NULL;
