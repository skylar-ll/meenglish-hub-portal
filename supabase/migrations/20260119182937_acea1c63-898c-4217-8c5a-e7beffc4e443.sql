-- Add date_of_birth and nationality to students table for certificate generation
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Saudi';

-- Add final_grade and grade_letter to student_certificates for displaying grade on certificate
ALTER TABLE public.student_certificates 
ADD COLUMN IF NOT EXISTS final_grade NUMERIC,
ADD COLUMN IF NOT EXISTS grade_letter TEXT;

-- Add total_levels and completed_levels for progress tracking
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS total_levels INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS completed_levels INTEGER DEFAULT 0;