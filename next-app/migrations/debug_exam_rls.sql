-- Check policies
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'exam_attempts';

-- Check if Exam 1652 is linked to a public course
SELECT e.id as exam_id, e.title, c.id as course_id, c.title as course_title, c.is_public
FROM exams e
LEFT JOIN course_exams ce ON e.id = ce.exam_id
LEFT JOIN courses c ON ce.course_id = c.id
WHERE e.id = 1652;
