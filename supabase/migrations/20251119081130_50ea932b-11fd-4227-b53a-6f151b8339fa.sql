-- Fix duplicate teacher assignments
-- Keep only the most recent class assignment for each teacher
WITH RankedClasses AS (
  SELECT 
    id,
    teacher_id,
    ROW_NUMBER() OVER (PARTITION BY teacher_id ORDER BY created_at DESC) as rn
  FROM classes
  WHERE teacher_id IS NOT NULL
)
UPDATE classes
SET teacher_id = NULL
WHERE id IN (
  SELECT id 
  FROM RankedClasses 
  WHERE rn > 1
);

-- Now add UNIQUE constraint on teacher_id to enforce one-to-one relationship
-- This ensures one teacher can only be assigned to one class at a time
ALTER TABLE public.classes 
ADD CONSTRAINT classes_teacher_id_unique UNIQUE (teacher_id);