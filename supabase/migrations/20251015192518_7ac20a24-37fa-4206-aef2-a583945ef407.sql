-- Add fields to students table for tracking dates and grades
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS registration_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS expiration_date DATE,
ADD COLUMN IF NOT EXISTS stop_postpone_dates TEXT[],
ADD COLUMN IF NOT EXISTS total_grade DECIMAL(5,2);

-- Create teacher_schedules table
CREATE TABLE IF NOT EXISTS teacher_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  course_name TEXT NOT NULL,
  level TEXT,
  day_of_week TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student_weekly_reports table
CREATE TABLE IF NOT EXISTS student_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Auto-filled course info (from student record)
  course_name TEXT,
  level TEXT,
  schedule TEXT,
  registration_date DATE,
  expiration_date DATE,
  current_grade DECIMAL(5,2),
  
  -- Teacher-editable skill ratings (1-5 scale)
  vocabulary_rating INTEGER CHECK (vocabulary_rating >= 1 AND vocabulary_rating <= 5),
  grammar_rating INTEGER CHECK (grammar_rating >= 1 AND grammar_rating <= 5),
  reading_rating INTEGER CHECK (reading_rating >= 1 AND reading_rating <= 5),
  writing_rating INTEGER CHECK (writing_rating >= 1 AND writing_rating <= 5),
  speaking_rating INTEGER CHECK (speaking_rating >= 1 AND speaking_rating <= 5),
  attendance_rating INTEGER CHECK (attendance_rating >= 1 AND attendance_rating <= 5),
  
  -- Exam scores
  exam_1_score DECIMAL(5,2),
  exam_2_score DECIMAL(5,2),
  exam_3_score DECIMAL(5,2),
  exam_4_score DECIMAL(5,2),
  
  -- Comments
  teacher_comments TEXT,
  teacher_notes TEXT,
  teacher_name TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(student_id, week_number, report_date)
);

-- Enable RLS
ALTER TABLE teacher_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_weekly_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher_schedules
CREATE POLICY "Teachers can manage their own schedules"
  ON teacher_schedules FOR ALL
  USING (teacher_id = auth.uid() AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Admins can view all schedules"
  ON teacher_schedules FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for student_weekly_reports
CREATE POLICY "Teachers can manage reports for their students"
  ON student_weekly_reports FOR ALL
  USING (teacher_id = auth.uid() AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can view their own reports"
  ON student_weekly_reports FOR SELECT
  USING (
    has_role(auth.uid(), 'student'::app_role) 
    AND student_id IN (
      SELECT id FROM students WHERE email = (auth.jwt() ->> 'email'::text)
    )
  );

CREATE POLICY "Admins can view all reports"
  ON student_weekly_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_teacher_schedules_updated_at
  BEFORE UPDATE ON teacher_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_weekly_reports_updated_at
  BEFORE UPDATE ON student_weekly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();