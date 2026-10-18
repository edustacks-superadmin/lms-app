SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('courses', 'chapters', 'chapter_contents', 'exams', 'questions', 'exam_questions', 'exam_attempts');
