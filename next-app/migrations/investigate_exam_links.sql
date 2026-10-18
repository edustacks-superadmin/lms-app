-- Check exams table structure and sample data to find a way to link
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exams';

-- Try to find exams that might match the broken content
SELECT id, title, description 
FROM public.exams 
WHERE title ILIKE '%534 MT-01%' OR title ILIKE '%534 GT-01%';

-- Check chapter_contents again for testpress_id
SELECT id, title, testpress_id, exam_id 
FROM public.chapter_contents 
WHERE type = 'exam' AND exam_id IS NULL
LIMIT 5;
