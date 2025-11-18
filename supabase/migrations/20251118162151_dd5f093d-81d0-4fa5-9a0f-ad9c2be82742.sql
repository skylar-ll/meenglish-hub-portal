-- Remove the incorrect unique constraint
-- The existing schema already supports one teacher per class, with teachers able to teach multiple classes
ALTER TABLE public.classes 
DROP CONSTRAINT classes_teacher_id_unique;