-- Drop the restrictive policy that only allows student role insertion
DROP POLICY IF EXISTS "Users can insert student role only during signup" ON public.user_roles;

-- Create a new policy that allows users to insert their own student OR teacher role during signup
CREATE POLICY "Users can insert own role during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  (role = 'student'::app_role OR role = 'teacher'::app_role)
);

-- Ensure the setup-admin function can work without JWT verification
-- (This is handled in config.toml separately)