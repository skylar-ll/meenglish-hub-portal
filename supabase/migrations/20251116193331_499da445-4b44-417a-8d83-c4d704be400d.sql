-- Fix teachers table RLS policies to allow admin creation of teacher accounts

-- Drop the existing "Admins can insert teachers" policy if it exists
DROP POLICY IF EXISTS "Admins can insert teachers" ON public.teachers;

-- Create a new policy that properly allows admins to insert teacher records
CREATE POLICY "Admins can insert teachers"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Also ensure the "Teachers can insert own record during signup" policy allows the scenario
DROP POLICY IF EXISTS "Teachers can insert own record during signup" ON public.teachers;

CREATE POLICY "Teachers can insert own record during signup"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = id) AND (email = (auth.jwt() ->> 'email'::text))
);