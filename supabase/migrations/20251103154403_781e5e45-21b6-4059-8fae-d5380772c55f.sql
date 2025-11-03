-- Change course_name to courses array to support multiple courses
ALTER TABLE public.classes 
  ADD COLUMN courses TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Copy existing course_name data to courses array
UPDATE public.classes 
SET courses = ARRAY[course_name] 
WHERE course_name IS NOT NULL;

-- Drop old course_name column
ALTER TABLE public.classes 
  DROP COLUMN course_name;