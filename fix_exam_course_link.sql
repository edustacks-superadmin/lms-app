-- Check the current state of the Physics Midterm exam
SELECT 
    e.id,
    e.title,
    e.course_id,
    c.title as course_title
FROM exams e
LEFT JOIN courses c ON e.course_id = c.id
WHERE e.title = 'Physics Midterm';

-- If course_id is NULL, you need to update it
-- Find the course you want to link it to:
SELECT id, title FROM courses;

-- Then update the exam with the correct course_id:
-- UPDATE exams SET course_id = 'your-course-id-here' WHERE title = 'Physics Midterm';
