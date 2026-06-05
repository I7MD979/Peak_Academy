-- Add preparatory / secondary school level to sessions

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS school_level text
  CHECK (school_level IN ('preparatory', 'secondary'));

UPDATE sessions
SET school_level = 'secondary'
WHERE school_level IS NULL;

-- Allow new grade values while keeping legacy first/second/third
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_grade_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_grade_check CHECK (
  grade IN (
    'first', 'second', 'third',
    'prep_first', 'prep_second', 'prep_third',
    'sec_first', 'sec_second', 'sec_third'
  )
);
