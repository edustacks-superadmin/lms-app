-- Add foreign key constraints to content_progress table
-- This ensures referential integrity for course_id and chapter_id

-- Add foreign key for course_id
ALTER TABLE content_progress
ADD CONSTRAINT fk_content_progress_course
FOREIGN KEY (course_id) 
REFERENCES courses(id) 
ON DELETE CASCADE;

-- Add foreign key for chapter_id
ALTER TABLE content_progress
ADD CONSTRAINT fk_content_progress_chapter
FOREIGN KEY (chapter_id) 
REFERENCES chapters(id) 
ON DELETE CASCADE;

-- Add foreign key for content_id (to chapter_contents)
ALTER TABLE content_progress
ADD CONSTRAINT fk_content_progress_content
FOREIGN KEY (content_id) 
REFERENCES chapter_contents(id) 
ON DELETE CASCADE;

-- Verify the constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'content_progress';
