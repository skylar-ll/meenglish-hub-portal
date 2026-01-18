-- Drop and recreate teacher_videos table to link to classes instead of levels
DROP TABLE IF EXISTS teacher_videos;

CREATE TABLE public.teacher_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_videos ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own videos
CREATE POLICY "Teachers can manage their own videos"
ON public.teacher_videos
FOR ALL
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

-- Admins can manage all videos
CREATE POLICY "Admins can manage all videos"
ON public.teacher_videos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Students can view videos for their enrolled classes
CREATE POLICY "Students can view videos for their enrolled classes"
ON public.teacher_videos
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND class_id IN (
    SELECT e.class_id 
    FROM enrollments e 
    JOIN students s ON s.id = e.student_id 
    WHERE s.email = (auth.jwt() ->> 'email'::text)
  )
);

-- Create storage bucket for videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-videos', 'teacher-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for teacher-videos bucket
CREATE POLICY "Teachers can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'teacher-videos' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can update their videos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'teacher-videos' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can delete their videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'teacher-videos' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Anyone can view teacher videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'teacher-videos');

CREATE POLICY "Admins can manage all storage"
ON storage.objects
FOR ALL
USING (bucket_id = 'teacher-videos' AND has_role(auth.uid(), 'admin'::app_role));