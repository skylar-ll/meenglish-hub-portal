-- Script to assign existing students to appropriate teachers based on their courses

DO $$
DECLARE
  student_record RECORD;
  leo_id UUID;
  lilly_id UUID;
  dorian_id UUID;
  aysha_id UUID;
  student_courses TEXT;
  course_array TEXT[];
  course TEXT;
  course_num INTEGER;
  course_lower TEXT;
BEGIN
  -- Get teacher IDs
  SELECT id INTO leo_id FROM teachers WHERE LOWER(full_name) LIKE '%leo%' LIMIT 1;
  SELECT id INTO lilly_id FROM teachers WHERE LOWER(full_name) LIKE '%lilly%' LIMIT 1;
  SELECT id INTO dorian_id FROM teachers WHERE LOWER(full_name) LIKE '%dorian%' LIMIT 1;
  SELECT id INTO aysha_id FROM teachers WHERE LOWER(full_name) LIKE '%aysha%' LIMIT 1;

  -- Loop through all students
  FOR student_record IN SELECT id, program, class_type FROM students LOOP
    -- Get student's courses (use program or class_type)
    student_courses := COALESCE(student_record.program, student_record.class_type, '');
    
    IF student_courses != '' THEN
      -- Split courses by comma
      course_array := string_to_array(student_courses, ',');
      
      -- Check each course and assign appropriate teachers
      FOREACH course IN ARRAY course_array LOOP
        course_lower := LOWER(TRIM(course));
        
        -- Extract course number if it exists
        course_num := NULL;
        IF course_lower ~ 'level.*([0-9]+)' THEN
          course_num := (regexp_match(course_lower, 'level.*([0-9]+)'))[1]::INTEGER;
        ELSIF course_lower ~ '^([0-9]+)' THEN
          course_num := (regexp_match(course_lower, '^([0-9]+)'))[1]::INTEGER;
        END IF;
        
        -- Leo: Courses 1-4
        IF course_num IS NOT NULL AND course_num >= 1 AND course_num <= 4 AND leo_id IS NOT NULL THEN
          INSERT INTO student_teachers (student_id, teacher_id)
          VALUES (student_record.id, leo_id)
          ON CONFLICT (student_id, teacher_id) DO NOTHING;
        END IF;
        
        -- Lilly: Courses 5-9, Spanish, Italian
        IF ((course_num IS NOT NULL AND course_num >= 5 AND course_num <= 9) 
            OR course_lower LIKE '%spanish%' 
            OR course_lower LIKE '%italian%') 
            AND lilly_id IS NOT NULL THEN
          INSERT INTO student_teachers (student_id, teacher_id)
          VALUES (student_record.id, lilly_id)
          ON CONFLICT (student_id, teacher_id) DO NOTHING;
        END IF;
        
        -- Dorian: Courses 10-12, Arabic, French, Chinese
        IF ((course_num IS NOT NULL AND course_num >= 10 AND course_num <= 12)
            OR course_lower LIKE '%arabic%'
            OR course_lower LIKE '%french%'
            OR course_lower LIKE '%chinese%')
            AND dorian_id IS NOT NULL THEN
          INSERT INTO student_teachers (student_id, teacher_id)
          VALUES (student_record.id, dorian_id)
          ON CONFLICT (student_id, teacher_id) DO NOTHING;
        END IF;
        
        -- Aysha: Courses 10-12, Speaking
        IF ((course_num IS NOT NULL AND course_num >= 10 AND course_num <= 12)
            OR course_lower LIKE '%speaking%')
            AND aysha_id IS NOT NULL THEN
          INSERT INTO student_teachers (student_id, teacher_id)
          VALUES (student_record.id, aysha_id)
          ON CONFLICT (student_id, teacher_id) DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;