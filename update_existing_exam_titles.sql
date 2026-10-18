-- Update existing exam-type chapter contents to populate the title from the linked exam
UPDATE chapter_contents cc
SET title = e.title
FROM exams e
WHERE cc.type = 'exam' 
  AND cc.exam_id = e.id
  AND (cc.title IS NULL OR cc.title = '' OR cc.title = 'EXAM');

-- Verify the update
SELECT 
    cc.id,
    cc.title as content_title,
    cc.type,
    cc.exam_id,
    e.title as exam_title
FROM chapter_contents cc
LEFT JOIN exams e ON cc.exam_id = e.id
WHERE cc.type = 'exam';
