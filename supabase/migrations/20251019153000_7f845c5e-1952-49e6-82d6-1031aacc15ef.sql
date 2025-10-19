-- Add student_id and course_duration_months columns to students table
ALTER TABLE public.students 
ADD COLUMN student_id TEXT UNIQUE,
ADD COLUMN course_duration_months INTEGER;

-- Create a function to generate the next student ID
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  new_id TEXT;
BEGIN
  -- Get the highest student number
  SELECT COALESCE(MAX(CAST(SUBSTRING(student_id FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.students
  WHERE student_id ~ '^STU-[0-9]+$';
  
  -- Format as STU-XXX (padded to 3 digits)
  new_id := 'STU-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_id;
END;
$$;

-- Create trigger function to auto-generate student_id on insert
CREATE OR REPLACE FUNCTION public.set_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_id IS NULL THEN
    NEW.student_id := generate_student_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate student_id
CREATE TRIGGER trigger_set_student_id
BEFORE INSERT ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.set_student_id();

-- Add course duration options to form_configurations
INSERT INTO public.form_configurations (config_type, config_key, config_value, display_order, is_active)
VALUES 
  ('course_duration', '1', '1 Month', 1, true),
  ('course_duration', '2', '2 Months', 2, true),
  ('course_duration', '6', '6 Months', 3, true),
  ('course_duration', '12', '12 Months', 4, true)
ON CONFLICT DO NOTHING;