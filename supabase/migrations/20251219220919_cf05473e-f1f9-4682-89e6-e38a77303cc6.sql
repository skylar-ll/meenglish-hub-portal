
-- Teacher Attendance Sheet Table (stores all attendance + grading data per student per month)
CREATE TABLE public.teacher_attendance_sheets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  month_year text NOT NULL, -- Format: YYYY-MM
  
  -- Week 1 Attendance (Su, M, Tu, W, Th)
  week1_su text CHECK (week1_su IN ('P', 'L', 'VL', 'A', NULL)),
  week1_m text CHECK (week1_m IN ('P', 'L', 'VL', 'A', NULL)),
  week1_tu text CHECK (week1_tu IN ('P', 'L', 'VL', 'A', NULL)),
  week1_w text CHECK (week1_w IN ('P', 'L', 'VL', 'A', NULL)),
  week1_th text CHECK (week1_th IN ('P', 'L', 'VL', 'A', NULL)),
  week1_wa numeric, -- Weekly Assessment grade
  
  -- Week 2 Attendance
  week2_su text CHECK (week2_su IN ('P', 'L', 'VL', 'A', NULL)),
  week2_m text CHECK (week2_m IN ('P', 'L', 'VL', 'A', NULL)),
  week2_tu text CHECK (week2_tu IN ('P', 'L', 'VL', 'A', NULL)),
  week2_w text CHECK (week2_w IN ('P', 'L', 'VL', 'A', NULL)),
  week2_th text CHECK (week2_th IN ('P', 'L', 'VL', 'A', NULL)),
  week2_wa numeric,
  
  -- Week 3 Attendance
  week3_su text CHECK (week3_su IN ('P', 'L', 'VL', 'A', NULL)),
  week3_m text CHECK (week3_m IN ('P', 'L', 'VL', 'A', NULL)),
  week3_tu text CHECK (week3_tu IN ('P', 'L', 'VL', 'A', NULL)),
  week3_w text CHECK (week3_w IN ('P', 'L', 'VL', 'A', NULL)),
  week3_th text CHECK (week3_th IN ('P', 'L', 'VL', 'A', NULL)),
  week3_wa numeric,
  
  -- Week 4 Attendance
  week4_su text CHECK (week4_su IN ('P', 'L', 'VL', 'A', NULL)),
  week4_m text CHECK (week4_m IN ('P', 'L', 'VL', 'A', NULL)),
  week4_tu text CHECK (week4_tu IN ('P', 'L', 'VL', 'A', NULL)),
  week4_w text CHECK (week4_w IN ('P', 'L', 'VL', 'A', NULL)),
  week4_th text CHECK (week4_th IN ('P', 'L', 'VL', 'A', NULL)),
  week4_wa numeric,
  
  -- Overall Section (all manual except monthly totals)
  overall_v numeric, -- V column (manual)
  teachers_evaluation numeric, -- Out of 20 (manual)
  final_grades numeric, -- Manual
  equivalent text, -- A+, A, B+, B, C, D
  status text CHECK (status IN ('Passed', 'Repeat', NULL)),
  notes text,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Unique constraint per student per month
  UNIQUE(student_id, month_year)
);

-- Enable RLS
ALTER TABLE public.teacher_attendance_sheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can manage their own attendance sheets"
ON public.teacher_attendance_sheets
FOR ALL
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

CREATE POLICY "Students can view their own attendance sheets"
ON public.teacher_attendance_sheets
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND student_id IN (
    SELECT id FROM public.students WHERE email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "Admins can manage all attendance sheets"
ON public.teacher_attendance_sheets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Student Certificates Table
CREATE TABLE public.student_certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  attendance_sheet_id uuid REFERENCES public.teacher_attendance_sheets(id) ON DELETE SET NULL,
  course_name text,
  level text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  certificate_type text NOT NULL DEFAULT 'completion', -- completion, passing
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Certificates
CREATE POLICY "Students can view their own certificates"
ON public.student_certificates
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND student_id IN (
    SELECT id FROM public.students WHERE email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "Teachers can manage certificates for their students"
ON public.teacher_attendance_sheets
FOR ALL
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

CREATE POLICY "Admins can manage all certificates"
ON public.student_certificates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add columns to existing student_weekly_reports for attendance summary
ALTER TABLE public.student_weekly_reports 
ADD COLUMN IF NOT EXISTS weekly_p_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_l_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_vl_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_a_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_assessment numeric;

-- Create trigger for updated_at
CREATE TRIGGER update_teacher_attendance_sheets_updated_at
BEFORE UPDATE ON public.teacher_attendance_sheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
