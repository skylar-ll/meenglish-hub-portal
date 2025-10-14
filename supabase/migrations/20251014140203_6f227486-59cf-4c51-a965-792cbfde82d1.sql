-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('present', 'absent')),
  marked_by text NOT NULL CHECK (marked_by IN ('student', 'teacher')),
  marked_at timestamp with time zone NOT NULL DEFAULT now(),
  class_time text,
  week_number integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, date, class_time)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" 
ON public.attendance 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for all users" 
ON public.attendance 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update for all users" 
ON public.attendance 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();