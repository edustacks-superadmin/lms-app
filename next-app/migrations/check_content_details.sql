SELECT id, title, type, url, file_path, exam_id
FROM public.chapter_contents
WHERE type IN ('video', 'exam') OR type = 'file'
ORDER BY type
LIMIT 20;
