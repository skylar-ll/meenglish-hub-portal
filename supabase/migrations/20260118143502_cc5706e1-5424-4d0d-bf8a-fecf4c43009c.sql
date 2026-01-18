-- Create table to track student video progress
CREATE TABLE public.student_video_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.teacher_videos(id) ON DELETE CASCADE,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, video_id)
);

-- Enable RLS
ALTER TABLE public.student_video_progress ENABLE ROW LEVEL SECURITY;

-- Students can view their own progress
CREATE POLICY "Students can view their own video progress"
  ON public.student_video_progress
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Students can mark videos as watched
CREATE POLICY "Students can insert their own video progress"
  ON public.student_video_progress
  FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Students can delete their own progress (unmark watched)
CREATE POLICY "Students can delete their own video progress"
  ON public.student_video_progress
  FOR DELETE
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE email = auth.jwt() ->> 'email'
    )
  );