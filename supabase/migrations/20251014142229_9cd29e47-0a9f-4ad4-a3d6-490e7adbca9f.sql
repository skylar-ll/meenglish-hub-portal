-- Add RLS policies for students table
CREATE POLICY "Authenticated users can insert during signup" ON public.students
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can insert students" ON public.students
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can update own record" ON public.students
FOR UPDATE 
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can delete students" ON public.students
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Add RLS policies for teachers table
CREATE POLICY "Admins can insert teachers" ON public.teachers
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can update own record" ON public.teachers
FOR UPDATE 
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can delete teachers" ON public.teachers
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Drop password_hash columns (no longer needed with Supabase Auth)
ALTER TABLE public.students DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.teachers DROP COLUMN IF EXISTS password_hash;