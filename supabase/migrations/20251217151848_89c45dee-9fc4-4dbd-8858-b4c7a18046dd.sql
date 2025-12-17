-- Allow students to view teachers assigned to their enrolled classes
CREATE POLICY "Students can view teachers of their classes" 
ON public.teachers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'student'::app_role) AND 
  id IN (
    SELECT c.teacher_id 
    FROM classes c
    JOIN enrollments e ON e.class_id = c.id
    JOIN students s ON s.id = e.student_id
    WHERE s.email = (auth.jwt() ->> 'email'::text)
    AND c.teacher_id IS NOT NULL
  )
);