-- Your system uses batch-based enrollment!
-- Member "name1" (email1@gmail.com) is in batch: e5adb069-f590-4809-a0e5-ef836f90fdd0
-- Course "Course1" already allows this batch!

-- Simply link the exam to Course1:
UPDATE exams 
SET course_id = '354cfd13-4680-4db3-967e-0b6a41839456'
WHERE title = 'Physics Midterm';

-- Verify the link:
SELECT 
    e.title as exam_title, 
    c.title as course_title,
    e.course_id,
    c.allowed_batches
FROM exams e
LEFT JOIN courses c ON e.course_id = c.id
WHERE e.title = 'Physics Midterm';

-- That's it! Since the member is already in the batch,
-- and the course already allows that batch,
-- the exam will automatically appear in ExamPortal!
