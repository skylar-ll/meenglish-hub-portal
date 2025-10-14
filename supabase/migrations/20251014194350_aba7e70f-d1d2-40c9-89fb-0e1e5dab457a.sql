-- Create student notes table
CREATE TABLE public.student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_notes
CREATE POLICY "Students can manage their own notes"
ON public.student_notes
FOR ALL
TO authenticated
USING (student_id = auth.uid() AND has_role(auth.uid(), 'student'::app_role));

-- Create indexes
CREATE INDEX idx_student_notes_student_id ON public.student_notes(student_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_student_notes_updated_at
BEFORE UPDATE ON public.student_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();