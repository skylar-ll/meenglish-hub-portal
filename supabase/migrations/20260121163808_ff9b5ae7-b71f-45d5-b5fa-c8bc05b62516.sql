-- Fix security issue: Remove overly permissive teacher access to billing data
-- Teachers should not see student financial records

DROP POLICY IF EXISTS "Teachers can view assigned students billing" ON public.billing;

-- Fix security issue: The students INSERT policy already requires email match
-- But let's make it more explicit and add a comment for clarity
-- The existing policy 'Authenticated users can insert during signup' with 
-- WITH CHECK (email = (auth.jwt() ->> 'email'::text)) is actually secure
-- because it ensures students can ONLY insert their own record (email must match JWT)

-- However, we should verify the policy is correct by recreating it with better naming
DROP POLICY IF EXISTS "Authenticated users can insert during signup" ON public.students;

CREATE POLICY "Students can insert their own record during signup" 
ON public.students 
FOR INSERT 
WITH CHECK (
  -- Email in the record must match the authenticated user's email
  email = (auth.jwt() ->> 'email'::text)
  -- User must have student role
  AND has_role(auth.uid(), 'student'::app_role)
);