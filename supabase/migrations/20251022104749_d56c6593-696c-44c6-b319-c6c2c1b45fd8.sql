-- Fix infinite recursion by removing cross-table reference in policy
DROP POLICY IF EXISTS "Students can view their teachers" ON public.student_teachers;

CREATE POLICY "Students can view their teachers"
ON public.student_teachers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'student'::app_role) AND student_id = auth.uid()
);
