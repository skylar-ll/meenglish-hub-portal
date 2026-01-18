-- Add columns to teacher_videos to support text-based lessons
ALTER TABLE public.teacher_videos 
ADD COLUMN IF NOT EXISTS lesson_type TEXT DEFAULT 'video' CHECK (lesson_type IN ('video', 'text', 'mixed')),
ADD COLUMN IF NOT EXISTS text_content TEXT,
ADD COLUMN IF NOT EXISTS lesson_order INTEGER DEFAULT 0;

-- Make video_url nullable for text-only lessons
ALTER TABLE public.teacher_videos ALTER COLUMN video_url DROP NOT NULL;