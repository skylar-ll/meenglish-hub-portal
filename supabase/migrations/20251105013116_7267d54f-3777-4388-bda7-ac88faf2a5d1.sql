-- Fix infinite recursion on students RLS by removing enrollments reference
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'students'
      AND policyname = 'Teachers can view assigned students via junction or enrollments'
  ) THEN
    EXECUTE 'DROP POLICY "Teachers can view assigned students via junction or enrollments" ON public.students';
  END IF;
END $$;

-- Recreate non-recursive policy for teachers to view assigned students
CREATE POLICY "Teachers can view assigned students"
ON public.students
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND id IN (
    SELECT st.student_id
    FROM public.student_teachers st
    WHERE st.teacher_id = auth.uid()
  )
);
