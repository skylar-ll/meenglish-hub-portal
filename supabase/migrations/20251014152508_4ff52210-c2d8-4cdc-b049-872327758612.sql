-- Update attendance policy to avoid querying auth.users
DROP POLICY IF EXISTS "Students can mark own attendance" ON attendance;

CREATE POLICY "Students can mark own attendance"
ON attendance
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'student'::app_role)
  AND (student_id IN (
    SELECT students.id FROM students
    WHERE students.email = auth.jwt()->>'email'
  ))
);
