-- Fix the foreign key constraint for classes.teacher_id to reference teachers table instead of auth.users
ALTER TABLE public.classes 
DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

ALTER TABLE public.classes 
ADD CONSTRAINT classes_teacher_id_fkey 
FOREIGN KEY (teacher_id) 
REFERENCES public.teachers(id) 
ON DELETE CASCADE;