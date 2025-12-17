-- Table to track daily class completion status
CREATE TABLE public.daily_class_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_class_status ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage daily class status"
ON public.daily_class_status FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view and update their own classes
CREATE POLICY "Teachers can view their class status"
ON public.daily_class_status FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

CREATE POLICY "Teachers can insert their class status"
ON public.daily_class_status FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

CREATE POLICY "Teachers can update their class status"
ON public.daily_class_status FOR UPDATE
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_class_status;

-- Add course_end_date to classes for tracking when courses end
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS end_date DATE;