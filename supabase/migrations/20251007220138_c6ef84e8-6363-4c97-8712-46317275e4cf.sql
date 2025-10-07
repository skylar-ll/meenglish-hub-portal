-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name_ar TEXT NOT NULL,
  full_name_en TEXT NOT NULL,
  phone1 TEXT NOT NULL,
  phone2 TEXT,
  email TEXT NOT NULL,
  national_id TEXT NOT NULL,
  branch TEXT NOT NULL,
  program TEXT NOT NULL,
  class_type TEXT NOT NULL,
  course_level TEXT,
  payment_method TEXT NOT NULL,
  subscription_status TEXT DEFAULT 'active',
  next_payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teachers table
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT,
  courses_assigned TEXT,
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Create policies for students table (public read for now - admin will access)
CREATE POLICY "Enable read access for all users" 
ON public.students 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for all users" 
ON public.students 
FOR INSERT 
WITH CHECK (true);

-- Create policies for teachers table
CREATE POLICY "Enable read access for all users" 
ON public.teachers 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for all users" 
ON public.teachers 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();