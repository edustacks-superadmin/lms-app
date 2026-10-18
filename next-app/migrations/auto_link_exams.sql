-- Auto-link exams where the Title matches exactly
UPDATE public.chapter_contents cc
SET exam_id = e.id
FROM public.exams e
WHERE cc.type = 'exam'
  AND cc.exam_id IS NULL
  AND cc.title = e.title;

-- Select remaining unlinked to show the user
SELECT count(*) as remaining_unlinked_exams
FROM public.chapter_contents
WHERE type = 'exam' AND exam_id IS NULL;
