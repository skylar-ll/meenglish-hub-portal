-- Create branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Anyone can view branches
CREATE POLICY "Anyone can view branches"
ON public.branches
FOR SELECT
USING (true);

-- Admins can manage branches
CREATE POLICY "Admins can manage branches"
ON public.branches
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- Enable RLS on enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Students can view their own enrollments
CREATE POLICY "Students can view their own enrollments"
ON public.enrollments
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND student_id IN (
    SELECT id FROM students WHERE email = (auth.jwt() ->> 'email')
  )
);

-- Admins can manage all enrollments
CREATE POLICY "Admins can manage enrollments"
ON public.enrollments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view enrollments for their classes
CREATE POLICY "Teachers can view class enrollments"
ON public.enrollments
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND class_id IN (
    SELECT id FROM classes WHERE teacher_id = auth.uid()
  )
);

-- Add new columns to classes table
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id),
ADD COLUMN IF NOT EXISTS program TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Add branch_id to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Create terms_and_conditions table for admin-editable content
CREATE TABLE IF NOT EXISTS public.terms_and_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on terms_and_conditions
ALTER TABLE public.terms_and_conditions ENABLE ROW LEVEL SECURITY;

-- Anyone can view terms
CREATE POLICY "Anyone can view terms"
ON public.terms_and_conditions
FOR SELECT
USING (true);

-- Admins can manage terms
CREATE POLICY "Admins can manage terms"
ON public.terms_and_conditions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default terms and conditions
INSERT INTO public.terms_and_conditions (content_en, content_ar)
VALUES (
  'Default Terms and Conditions in English. Admin can update this content.',
  'الشروط والأحكام الافتراضية باللغة العربية. يمكن للمسؤول تحديث هذا المحتوى.'
)
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at on branches
CREATE TRIGGER update_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default branches
INSERT INTO public.branches (name_en, name_ar, is_online)
VALUES 
  ('Dammam Branch', 'فرع الدمام', false),
  ('Riyadh Branch', 'فرع الرياض', false),
  ('Jeddah Branch', 'فرع جدة', false),
  ('Online Branch', 'فرع أونلاين', true)
ON CONFLICT DO NOTHING;