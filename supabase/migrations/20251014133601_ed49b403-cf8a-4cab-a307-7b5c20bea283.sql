-- Add password_hash column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS password_hash text;