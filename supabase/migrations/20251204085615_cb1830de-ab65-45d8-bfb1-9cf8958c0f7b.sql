-- Remove the unique constraint on teacher_id to allow one teacher to have multiple classes
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_teacher_id_unique;

-- Also drop the one-to-one foreign key constraint and recreate as regular foreign key
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

ALTER TABLE public.classes 
ADD CONSTRAINT classes_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;