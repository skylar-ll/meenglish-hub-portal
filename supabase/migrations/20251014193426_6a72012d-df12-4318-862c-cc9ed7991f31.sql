-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_published BOOLEAN NOT NULL DEFAULT true,
  total_points INTEGER NOT NULL DEFAULT 0
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple-choice', 'long-answer', 'image', 'video', 'audio')),
  question_text TEXT NOT NULL,
  media_url TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  correct_answer_index INTEGER,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_answers table (for multiple choice options)
CREATE TABLE public.quiz_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  total_points INTEGER,
  UNIQUE(quiz_id, student_id)
);

-- Create student_answers table
CREATE TABLE public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_index INTEGER,
  text_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes
CREATE POLICY "Teachers can manage their own quizzes"
ON public.quizzes
FOR ALL
TO authenticated
USING (teacher_id = auth.uid() AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can view published quizzes"
ON public.quizzes
FOR SELECT
TO authenticated
USING (is_published = true AND has_role(auth.uid(), 'student'::app_role));

CREATE POLICY "Admins can view all quizzes"
ON public.quizzes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for quiz_questions
CREATE POLICY "Teachers can manage questions for their quizzes"
ON public.quiz_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.teacher_id = auth.uid()
    AND has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Students can view questions for published quizzes"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'student'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.is_published = true
  )
);

-- RLS Policies for quiz_question_options
CREATE POLICY "Teachers can manage options for their quiz questions"
ON public.quiz_question_options
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_questions
    JOIN public.quizzes ON quizzes.id = quiz_questions.quiz_id
    WHERE quiz_questions.id = quiz_question_options.question_id
    AND quizzes.teacher_id = auth.uid()
    AND has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Students can view options for published quiz questions"
ON public.quiz_question_options
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'student'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.quiz_questions
    JOIN public.quizzes ON quizzes.id = quiz_questions.quiz_id
    WHERE quiz_questions.id = quiz_question_options.question_id
    AND quizzes.is_published = true
  )
);

-- RLS Policies for quiz_attempts
CREATE POLICY "Students can manage their own attempts"
ON public.quiz_attempts
FOR ALL
TO authenticated
USING (student_id = auth.uid() AND has_role(auth.uid(), 'student'::app_role));

CREATE POLICY "Teachers can view attempts for their quizzes"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = quiz_attempts.quiz_id
    AND quizzes.teacher_id = auth.uid()
  )
);

-- RLS Policies for student_answers
CREATE POLICY "Students can manage their own answers"
ON public.student_answers
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'student'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE quiz_attempts.id = student_answers.attempt_id
    AND quiz_attempts.student_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view answers for their quiz attempts"
ON public.student_answers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.quiz_attempts
    JOIN public.quizzes ON quizzes.id = quiz_attempts.quiz_id
    WHERE quiz_attempts.id = student_answers.attempt_id
    AND quizzes.teacher_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_quizzes_teacher_id ON public.quizzes(teacher_id);
CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_question_options_question_id ON public.quiz_question_options(question_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student_id ON public.quiz_attempts(student_id);
CREATE INDEX idx_student_answers_attempt_id ON public.student_answers(attempt_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();