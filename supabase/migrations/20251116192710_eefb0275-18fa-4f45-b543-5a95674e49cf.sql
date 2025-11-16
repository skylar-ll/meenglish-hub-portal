-- Make teacher_id nullable in classes table
ALTER TABLE public.classes 
ALTER COLUMN teacher_id DROP NOT NULL;