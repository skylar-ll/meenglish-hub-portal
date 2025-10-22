-- Student teacher assignment insert by student
DROP POLICY IF EXISTS "Students can insert own teacher assignments" ON student_teachers;
CREATE POLICY "Students can insert own teacher assignments"
ON student_teachers FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'student'::app_role) AND student_id = auth.uid()
);

-- Signatures storage policies
DROP POLICY IF EXISTS "Users can upload own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own signatures" ON storage.objects;

CREATE POLICY "Users can upload own signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text
);