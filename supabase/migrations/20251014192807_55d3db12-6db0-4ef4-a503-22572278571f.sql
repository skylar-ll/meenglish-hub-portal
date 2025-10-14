-- Create storage bucket for quiz media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-media',
  'quiz-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/mp3', 'application/pdf']
);

-- Allow teachers to upload quiz media
CREATE POLICY "Teachers can upload quiz media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quiz-media' AND
  (SELECT has_role(auth.uid(), 'teacher'::app_role))
);

-- Allow teachers to update their quiz media
CREATE POLICY "Teachers can update quiz media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'quiz-media' AND
  (SELECT has_role(auth.uid(), 'teacher'::app_role))
);

-- Allow teachers to delete quiz media
CREATE POLICY "Teachers can delete quiz media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'quiz-media' AND
  (SELECT has_role(auth.uid(), 'teacher'::app_role))
);

-- Allow public access to view quiz media
CREATE POLICY "Public can view quiz media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'quiz-media');