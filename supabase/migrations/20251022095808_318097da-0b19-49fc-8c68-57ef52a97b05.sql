-- Add INSERT policy for billing table to allow students to create billing records during registration
CREATE POLICY "Students can insert own billing during registration"
ON public.billing
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());