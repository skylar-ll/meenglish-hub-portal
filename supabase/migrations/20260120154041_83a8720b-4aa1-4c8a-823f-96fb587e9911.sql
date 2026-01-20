-- Fix security warning: Function Search Path Mutable for compute_grade_letter
CREATE OR REPLACE FUNCTION public.compute_grade_letter(p_grade numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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