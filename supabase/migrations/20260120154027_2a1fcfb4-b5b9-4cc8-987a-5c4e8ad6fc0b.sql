-- Fix certificate auto-generation + backfill missing certificates
-- Fixed: has_role signature is has_role(_user_id uuid, _role app_role)

-- 1) Ensure unique constraint exists on attendance_sheet_id (prevents duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_certificates_attendance_sheet_unique'
      AND conrelid = 'public.student_certificates'::regclass
  ) THEN
    ALTER TABLE public.student_certificates
      ADD CONSTRAINT student_certificates_attendance_sheet_unique
      UNIQUE (attendance_sheet_id);
  END IF;
END$$;

-- 2) Helper function to compute a letter grade when equivalent is missing
CREATE OR REPLACE FUNCTION public.compute_grade_letter(p_grade numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_grade IS NULL THEN
    RETURN NULL;
  ELSIF p_grade >= 95 THEN
    RETURN 'A+';
  ELSIF p_grade >= 90 THEN
    RETURN 'A';
  ELSIF p_grade >= 85 THEN
    RETURN 'B+';
  ELSIF p_grade >= 80 THEN
    RETURN 'B';
  ELSIF p_grade >= 75 THEN
    RETURN 'C+';
  ELSIF p_grade >= 70 THEN
    RETURN 'C';
  ELSIF p_grade >= 65 THEN
    RETURN 'D+';
  ELSIF p_grade >= 60 THEN
    RETURN 'D';
  ELSE
    RETURN 'F';
  END IF;
END;
$$;

-- 3) Trigger function: whenever an attendance sheet is saved as Passed with >=70, create certificate if missing
CREATE OR REPLACE FUNCTION public.auto_create_certificate_from_attendance_sheet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_name text;
  v_level text;
BEGIN
  IF NEW.status ILIKE 'Passed' AND COALESCE(NEW.final_grades, 0) >= 70 THEN
    SELECT s.program, s.course_level
      INTO v_course_name, v_level
    FROM public.students s
    WHERE s.id = NEW.student_id;

    INSERT INTO public.student_certificates (
      student_id,
      teacher_id,
      attendance_sheet_id,
      course_name,
      level,
      issue_date,
      certificate_type,
      final_grade,
      grade_letter
    )
    VALUES (
      NEW.student_id,
      NEW.teacher_id,
      NEW.id,
      v_course_name,
      v_level,
      CURRENT_DATE,
      'passing',
      NEW.final_grades,
      COALESCE(NEW.equivalent, public.compute_grade_letter(NEW.final_grades))
    )
    ON CONFLICT (attendance_sheet_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_certificate_from_attendance_sheet ON public.teacher_attendance_sheets;
CREATE TRIGGER trg_auto_create_certificate_from_attendance_sheet
AFTER INSERT OR UPDATE OF status, final_grades, equivalent
ON public.teacher_attendance_sheets
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_certificate_from_attendance_sheet();

-- 4) Backfill: create certificates for any existing attendance sheets already Passed with >=70
INSERT INTO public.student_certificates (
  student_id,
  teacher_id,
  attendance_sheet_id,
  course_name,
  level,
  issue_date,
  certificate_type,
  final_grade,
  grade_letter
)
SELECT
  tas.student_id,
  tas.teacher_id,
  tas.id,
  s.program,
  s.course_level,
  CURRENT_DATE,
  'passing',
  tas.final_grades,
  COALESCE(tas.equivalent, public.compute_grade_letter(tas.final_grades))
FROM public.teacher_attendance_sheets tas
JOIN public.students s ON s.id = tas.student_id
WHERE tas.status ILIKE 'Passed'
  AND COALESCE(tas.final_grades, 0) >= 70
  AND tas.id IS NOT NULL
ON CONFLICT (attendance_sheet_id) DO NOTHING;

-- 5) Ensure students.completed_levels isn't lower than the number of passing certs they have
WITH cert_counts AS (
  SELECT student_id, COUNT(*)::int AS cnt
  FROM public.student_certificates
  WHERE certificate_type = 'passing'
  GROUP BY student_id
)
UPDATE public.students s
SET completed_levels = GREATEST(COALESCE(s.completed_levels, 0), cc.cnt)
FROM cert_counts cc
WHERE s.id = cc.student_id;

-- 6) RLS policies for student_certificates
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own certificates" ON public.student_certificates;
DROP POLICY IF EXISTS "Teachers/admins can insert certificates" ON public.student_certificates;
DROP POLICY IF EXISTS "Teachers/admins can view certificates" ON public.student_certificates;

CREATE POLICY "Students can view their own certificates"
ON public.student_certificates
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_certificates.student_id
      AND lower(s.email) = lower((auth.jwt() ->> 'email'))
  )
);

-- Use correct has_role signature: has_role(_user_id uuid, _role app_role)
CREATE POLICY "Teachers/admins can insert certificates"
ON public.student_certificates
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Teachers/admins can view certificates"
ON public.student_certificates
FOR SELECT
USING (
  public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)
);