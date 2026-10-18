SELECT column_name, data_type, table_name
FROM information_schema.columns 
WHERE table_name IN ('chapters', 'chapter_contents')
ORDER BY table_name, ordinal_position;
