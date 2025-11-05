DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'enrollments' 
      AND policyname = 'Students can insert their own enrollments'
  ) THEN
    CREATE POLICY "Students can insert their own enrollments"
    ON public.enrollments
    FOR INSERT
    WITH CHECK (
      has_role(auth.uid(), 'student'::app_role)
      AND (student_id IN (
        SELECT s.id FROM public.students s
        WHERE s.email = (auth.jwt() ->> 'email')
      ))
    );
  END IF;
END $$;