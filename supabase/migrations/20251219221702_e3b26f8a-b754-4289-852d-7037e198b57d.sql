
-- Fix: Add INSERT policy for teachers to create certificates
CREATE POLICY "Teachers can insert certificates"
ON public.student_certificates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

-- Add SELECT policy for teachers to view certificates they created
CREATE POLICY "Teachers can view their certificates"
ON public.student_certificates
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());
