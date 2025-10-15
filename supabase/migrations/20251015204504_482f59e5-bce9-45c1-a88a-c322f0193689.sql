-- First, delete orphaned reports that reference non-existent teachers
DELETE FROM public.student_weekly_reports 
WHERE teacher_id NOT IN (SELECT id FROM public.teachers);

-- Now add the foreign key constraints
ALTER TABLE public.student_weekly_reports
ADD CONSTRAINT student_weekly_reports_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES public.students(id) 
ON DELETE CASCADE;

ALTER TABLE public.student_weekly_reports
ADD CONSTRAINT student_weekly_reports_teacher_id_fkey 
FOREIGN KEY (teacher_id) 
REFERENCES public.teachers(id) 
ON DELETE CASCADE;

-- Add teacher_id column to students table to track which teacher teaches each student
ALTER TABLE public.students
ADD COLUMN teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL;