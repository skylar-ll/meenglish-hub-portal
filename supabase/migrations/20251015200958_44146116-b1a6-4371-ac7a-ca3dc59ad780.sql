-- Allow teachers to insert their own record during signup
CREATE POLICY "Teachers can insert own record during signup"
ON public.teachers
FOR INSERT
WITH CHECK (
  auth.uid() = id AND 
  email = (auth.jwt() ->> 'email'::text)
);