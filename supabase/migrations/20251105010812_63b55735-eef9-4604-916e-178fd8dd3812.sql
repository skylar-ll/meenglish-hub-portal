-- Allow teachers to view students enrolled in their classes
DROP POLICY IF EXISTS "Teachers can view assigned students only" ON public.students;

CREATE POLICY "Teachers can view assigned students via junction or enrollments"
ON public.students
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND (
    -- Via student_teachers junction table
    id IN (
      SELECT student_teachers.student_id 
      FROM student_teachers 
      WHERE student_teachers.teacher_id = auth.uid()
    )
    OR
    -- Via enrollments in teacher's classes
    id IN (
      SELECT enrollments.student_id
      FROM enrollments
      JOIN classes ON classes.id = enrollments.class_id
      WHERE classes.teacher_id = auth.uid()
    )
  )
);