-- Drop the problematic RLS policies that reference auth.users
DROP POLICY IF EXISTS "Teachers can view own record" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update own record" ON public.teachers;

-- Recreate them without referencing auth.users directly
CREATE POLICY "Teachers can view own record"
ON public.teachers
FOR SELECT
USING (
  auth.uid() = id
  AND has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Teachers can update own record"
ON public.teachers
FOR UPDATE
USING (
  auth.uid() = id
  AND has_role(auth.uid(), 'teacher'::app_role)
);