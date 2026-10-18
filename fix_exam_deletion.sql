-- Drop the existing constraint that prevents deletion
ALTER TABLE chapter_contents
DROP CONSTRAINT IF EXISTS chapter_contents_exam_id_fkey;

-- Add the new constraint with ON DELETE CASCADE
-- This ensures that when an exam is deleted, the corresponding content item in the course is also removed
ALTER TABLE chapter_contents
ADD CONSTRAINT chapter_contents_exam_id_fkey
FOREIGN KEY (exam_id)
REFERENCES exams(id)
ON DELETE CASCADE;
