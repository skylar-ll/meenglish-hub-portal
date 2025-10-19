-- Create student_teachers junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.student_teachers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, teacher_id)
);

-- Enable RLS
ALTER TABLE public.student_teachers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_teachers
CREATE POLICY "Admins can manage student_teachers"
ON public.student_teachers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their assigned students"
ON public.student_teachers
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

CREATE POLICY "Students can view their teachers"
ON public.student_teachers
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND student_id IN (
    SELECT id FROM students WHERE email = (auth.jwt() ->> 'email')
  )
);

-- Update generate_student_id function to create random alphanumeric IDs
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 9-character alphanumeric string (like x4578vYEU)
    new_id := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 9));
    
    -- Check if this ID already exists
    SELECT EXISTS(SELECT 1 FROM public.students WHERE student_id = new_id) INTO id_exists;
    
    -- If ID doesn't exist, we can use it
    IF NOT id_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_id;
END;
$function$;

-- Update all existing students with NULL or old-format student_ids
UPDATE public.students
SET student_id = generate_student_id()
WHERE student_id IS NULL OR student_id LIKE 'STU-%';

-- Migrate existing teacher_id relationships to junction table
INSERT INTO public.student_teachers (student_id, teacher_id)
SELECT id, teacher_id
FROM public.students
WHERE teacher_id IS NOT NULL
ON CONFLICT (student_id, teacher_id) DO NOTHING;