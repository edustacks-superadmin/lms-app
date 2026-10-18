-- Get Student ID
SELECT id, email, name FROM members WHERE email = 'mahesh.maladri@gmail.com';

-- Check Student's Batches
SELECT * FROM batch_students 
WHERE student_id IN (SELECT id FROM members WHERE email = 'mahesh.maladri@gmail.com');

-- Check Student's Direct Course Access
SELECT * FROM course_access 
WHERE student_id IN (SELECT id FROM members WHERE email = 'mahesh.maladri@gmail.com');

-- List Active Exams and their Course/Batch links
SELECT id, title, course_id, batch_ids, status 
FROM exams 
WHERE status = 'published' OR status = 'active'
LIMIT 5;
