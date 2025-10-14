-- Add grading fields to quiz_attempts
ALTER TABLE public.quiz_attempts
ADD COLUMN grade TEXT,
ADD COLUMN teacher_feedback TEXT,
ADD COLUMN graded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN graded_by UUID;

-- Add per-question feedback to student_answers
ALTER TABLE public.student_answers
ADD COLUMN teacher_feedback TEXT,
ADD COLUMN points_awarded INTEGER;