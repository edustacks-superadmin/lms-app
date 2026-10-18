SELECT count(*) as video_count FROM public.chapter_contents WHERE type = 'video';
SELECT id, title, type, url FROM public.chapter_contents WHERE type = 'video' LIMIT 5;
