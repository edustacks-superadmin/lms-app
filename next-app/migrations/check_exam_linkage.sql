-- Check if the exam_ids in chapter_contents actually exist in the exams table
SELECT 
    cc.id as content_id,
    cc.title,
    cc.exam_id as linked_exam_id,
    e.id as found_exam_id,
    e.title as found_exam_title
FROM public.chapter_contents cc
LEFT JOIN public.exams e ON cc.exam_id = e.id
WHERE cc.type = 'exam'
LIMIT 10;
