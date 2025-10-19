-- Update all existing students without student_id to have one
DO $$
DECLARE
  student_record RECORD;
BEGIN
  FOR student_record IN 
    SELECT id FROM students WHERE student_id IS NULL
  LOOP
    UPDATE students 
    SET student_id = generate_student_id() 
    WHERE id = student_record.id;
  END LOOP;
END $$;