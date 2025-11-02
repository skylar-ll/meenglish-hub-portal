-- Break policy recursion by moving student enrollment check into a SECURITY DEFINER function
-- This avoids referencing class_students (which has a policy referencing classes) directly in the classes policy

-- 1) Helper function to check if current JWT user (student) is enrolled in a class
CREATE OR REPLACE FUNCTION public.is_student_enrolled_in_class(p_class_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Read email from JWT; return false if absent
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NULL THEN
    RETURN false;
  END IF;

  -- Check enrollment without triggering RLS recursion
  RETURN EXISTS (
    SELECT 1
    FROM public.class_students cs
    JOIN public.students s ON s.id = cs.student_id
    WHERE cs.class_id = p_class_id
      AND s.email = v_email
  );
END;
$$;

-- Restrict and grant execute
REVOKE ALL ON FUNCTION public.is_student_enrolled_in_class(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_student_enrolled_in_class(uuid) TO authenticated;

-- 2) Replace the student SELECT policy on classes with a function-based one to avoid recursion
DROP POLICY IF EXISTS "Students can view their enrolled classes" ON public.classes;

CREATE POLICY "Students can view their enrolled classes"
ON public.classes
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role)
  AND public.is_student_enrolled_in_class(id)
);
