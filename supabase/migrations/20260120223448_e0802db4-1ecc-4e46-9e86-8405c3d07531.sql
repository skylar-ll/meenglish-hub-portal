-- 1) Ensure billing has date_of_birth
ALTER TABLE public.billing
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 2) Keep student_certificates in sync with teacher_attendance_sheets (upsert + delete when no longer eligible)
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
    ON CONFLICT (attendance_sheet_id) DO UPDATE
    SET
      student_id = EXCLUDED.student_id,
      teacher_id = EXCLUDED.teacher_id,
      course_name = EXCLUDED.course_name,
      level = EXCLUDED.level,
      certificate_type = EXCLUDED.certificate_type,
      final_grade = EXCLUDED.final_grade,
      grade_letter = EXCLUDED.grade_letter;
  ELSE
    -- If a sheet is changed away from Passed or drops below 70, remove the certificate for that sheet.
    DELETE FROM public.student_certificates sc
    WHERE sc.attendance_sheet_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Refresh ALL certificates to match latest attendance sheet grades (fixes stale grade letters like B+ vs B)
-- 3a) Upsert all eligible certificates
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
ON CONFLICT (attendance_sheet_id) DO UPDATE
SET
  student_id = EXCLUDED.student_id,
  teacher_id = EXCLUDED.teacher_id,
  course_name = EXCLUDED.course_name,
  level = EXCLUDED.level,
  certificate_type = EXCLUDED.certificate_type,
  final_grade = EXCLUDED.final_grade,
  grade_letter = EXCLUDED.grade_letter;

-- 3b) Delete any certificates that are no longer eligible
DELETE FROM public.student_certificates sc
USING public.teacher_attendance_sheets tas
WHERE sc.attendance_sheet_id = tas.id
  AND NOT (tas.status ILIKE 'Passed' AND COALESCE(tas.final_grades, 0) >= 70);

-- 4) Backfill DOB between students and billing (for consistency)
-- billing.date_of_birth <- students.date_of_birth
UPDATE public.billing b
SET date_of_birth = s.date_of_birth
FROM public.students s
WHERE b.student_id = s.id
  AND b.date_of_birth IS NULL
  AND s.date_of_birth IS NOT NULL;

-- students.date_of_birth <- billing.date_of_birth
UPDATE public.students s
SET date_of_birth = b.date_of_birth
FROM public.billing b
WHERE b.student_id = s.id
  AND s.date_of_birth IS NULL
  AND b.date_of_birth IS NOT NULL;

-- 5) Keep students.completed_levels in sync (at least number of passing certs)
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
