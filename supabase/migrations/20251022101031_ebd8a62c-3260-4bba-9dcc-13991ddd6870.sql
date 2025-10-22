-- Fix 1: Restrict teacher role self-assignment in user_roles RLS policy
-- Only allow students to self-assign during signup, require admin for teacher role
DROP POLICY IF EXISTS "Users can insert own non-admin role during signup" ON public.user_roles;

CREATE POLICY "Users can insert student role only during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'student'::app_role
);

-- Fix 2: Scope teacher access to only assigned students
DROP POLICY IF EXISTS "Teachers can view students" ON public.students;

CREATE POLICY "Teachers can view assigned students only"
ON public.students
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND id IN (
    SELECT student_id 
    FROM student_teachers 
    WHERE teacher_id = auth.uid()
  )
);