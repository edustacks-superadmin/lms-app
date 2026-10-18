-- 1. Get Student ID
WITH student AS (
    SELECT id FROM members WHERE email = 'mahesh.maladri@gmail.com'
)
-- 2. Find Courses the student has access to (via direct access or batches)
SELECT 
    c.id as course_id, 
    c.title as course_title,
    e.id as exam_id,
    e.title as exam_title
FROM courses c
JOIN exams e ON e.course_id = c.id
WHERE 
    -- Check direct course access
    c.id IN (SELECT course_id FROM course_access WHERE student_id = (SELECT id FROM student))
    OR
    -- Check batch access
    EXISTS (
        SELECT 1 FROM batch_students bs
        JOIN batches b ON b.id = bs.batch_id
        WHERE bs.student_id = (SELECT id FROM student)
        AND b.course_ids @> ARRAY[c.id]
    )
LIMIT 1;
