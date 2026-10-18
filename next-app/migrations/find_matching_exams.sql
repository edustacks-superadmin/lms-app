-- Find potential matches for unlinked exams based on Title
SELECT 
    cc.id as content_id, 
    cc.title as content_title, 
    e.id as potential_exam_id, 
    e.title as exam_title
FROM public.chapter_contents cc
JOIN public.exams e ON e.title = cc.title OR e.title ILIKE cc.title || '%'
WHERE cc.type = 'exam' 
AND cc.exam_id IS NULL;
