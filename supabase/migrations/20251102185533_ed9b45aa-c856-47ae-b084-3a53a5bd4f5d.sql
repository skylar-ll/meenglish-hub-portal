-- Allow students to view classes they are enrolled in
CREATE POLICY "Students can view their enrolled classes"
ON public.classes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND EXISTS (
    SELECT 1 FROM class_students cs
    JOIN students s ON s.id = cs.student_id
    WHERE cs.class_id = classes.id
    AND s.email = (auth.jwt() ->> 'email'::text)
  )
);