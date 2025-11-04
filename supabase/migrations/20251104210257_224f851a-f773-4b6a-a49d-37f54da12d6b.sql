-- Allow anyone to view active classes for registration purposes
-- This is needed so students can see available options during signup
CREATE POLICY "Anyone can view active classes for registration"
ON public.classes
FOR SELECT
USING (status = 'active');
