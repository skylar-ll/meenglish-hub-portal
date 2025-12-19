-- Add second teacher evaluation column
ALTER TABLE public.teacher_attendance_sheets 
ADD COLUMN teachers_evaluation_2 numeric DEFAULT NULL;