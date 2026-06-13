-- Allow preparatory and secondary grade values on student_profiles (matches sessions table)

ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_grade_check;

ALTER TABLE public.student_profiles ADD CONSTRAINT student_profiles_grade_check CHECK (
  grade IS NULL OR grade IN (
    'first', 'second', 'third',
    'prep_first', 'prep_second', 'prep_third',
    'sec_first', 'sec_second', 'sec_third'
  )
);
