-- Create storage bucket for teacher videos (unlimited size)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('teacher-videos', 'teacher-videos', true, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create table for teacher videos
CREATE TABLE public.teacher_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  level TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can manage all videos
CREATE POLICY "Admins can manage all videos"
ON public.teacher_videos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can manage their own videos
CREATE POLICY "Teachers can manage their own videos"
ON public.teacher_videos
FOR ALL
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

-- Students can view videos for their level
CREATE POLICY "Students can view videos for their level"
ON public.teacher_videos
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) AND
  level IN (
    SELECT unnest(string_to_array(s.course_level, ', '))
    FROM students s
    WHERE s.email = (auth.jwt() ->> 'email'::text)
  )
);

-- Storage policies for teacher-videos bucket
CREATE POLICY "Admins can manage all video files"
ON storage.objects
FOR ALL
USING (bucket_id = 'teacher-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can upload video files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'teacher-videos' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can delete their own video files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'teacher-videos' AND has_role(auth.uid(), 'teacher'::app_role) AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view video files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'teacher-videos');

-- Create index for faster level-based queries
CREATE INDEX idx_teacher_videos_level ON public.teacher_videos(level);
CREATE INDEX idx_teacher_videos_teacher_id ON public.teacher_videos(teacher_id);

-- Add trigger for updated_at
CREATE TRIGGER update_teacher_videos_updated_at
BEFORE UPDATE ON public.teacher_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();