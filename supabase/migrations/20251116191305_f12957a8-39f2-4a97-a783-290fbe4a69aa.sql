-- Create function to auto-assign students to teachers when enrolling in classes
CREATE OR REPLACE FUNCTION auto_assign_student_to_teacher()
RETURNS TRIGGER AS $$
BEGIN
  -- When a student enrolls in a class, automatically create student_teachers link
  INSERT INTO public.student_teachers (student_id, teacher_id)
  SELECT NEW.student_id, c.teacher_id
  FROM public.classes c
  WHERE c.id = NEW.class_id
    AND c.teacher_id IS NOT NULL
  ON CONFLICT (student_id, teacher_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on enrollments table
DROP TRIGGER IF EXISTS trigger_auto_assign_teacher ON public.enrollments;
CREATE TRIGGER trigger_auto_assign_teacher
  AFTER INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_student_to_teacher();

-- Also create trigger on class_students for backward compatibility
DROP TRIGGER IF EXISTS trigger_auto_assign_teacher_class_students ON public.class_students;
CREATE TRIGGER trigger_auto_assign_teacher_class_students
  AFTER INSERT ON public.class_students
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_student_to_teacher();

-- Add unique constraint to prevent duplicate student-teacher assignments
ALTER TABLE public.student_teachers 
DROP CONSTRAINT IF EXISTS student_teachers_student_id_teacher_id_key;

ALTER TABLE public.student_teachers
ADD CONSTRAINT student_teachers_student_id_teacher_id_key 
UNIQUE (student_id, teacher_id);