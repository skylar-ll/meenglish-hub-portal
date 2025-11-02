-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  timing TEXT NOT NULL,
  course_name TEXT NOT NULL,
  level TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_students junction table
CREATE TABLE public.class_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "Admins can manage all classes"
ON public.classes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their own classes"
ON public.classes
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

-- RLS Policies for class_students
CREATE POLICY "Admins can manage class students"
ON public.class_students
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their class students"
ON public.class_students
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.classes 
    WHERE classes.id = class_students.class_id 
    AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own class assignments"
ON public.class_students
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) AND 
  student_id IN (
    SELECT id FROM students WHERE email = (auth.jwt() ->> 'email')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();