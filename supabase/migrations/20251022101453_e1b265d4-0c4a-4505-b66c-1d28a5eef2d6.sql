-- Fix 1: Make quiz-media bucket private and add proper RLS policies
UPDATE storage.buckets
SET public = false
WHERE id = 'quiz-media';

-- Add RLS policy for quiz media - only students taking published quizzes can view
CREATE POLICY "Students can view quiz media for published quizzes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'quiz-media' 
  AND has_role(auth.uid(), 'student'::app_role)
  AND EXISTS (
    SELECT 1 
    FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.media_url LIKE '%' || name || '%'
    AND q.is_published = true
  )
);

-- Teachers can manage quiz media for their own quizzes
CREATE POLICY "Teachers can manage quiz media for their quizzes"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'quiz-media'
  AND has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 
    FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.media_url LIKE '%' || name || '%'
    AND q.teacher_id = auth.uid()
  )
);

-- Fix 2: Simplify billing RLS policy to use direct user_id comparison
DROP POLICY IF EXISTS "Students can view own billing" ON billing;

CREATE POLICY "Students can view own billing"
ON billing FOR SELECT
TO authenticated
USING (student_id = auth.uid());