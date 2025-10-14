-- Allow users to insert their own non-admin roles during signup
CREATE POLICY "Users can insert own non-admin role during signup" ON public.user_roles
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  role IN ('teacher', 'student')
);