-- Add registered_by_employee column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS registered_by_employee TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.students.registered_by_employee IS 'Name of the employee who registered this student';