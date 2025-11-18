-- Add unique constraint to ensure one teacher can only be assigned to one class
ALTER TABLE public.classes 
ADD CONSTRAINT classes_teacher_id_unique UNIQUE (teacher_id);