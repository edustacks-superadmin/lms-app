-- Add unique constraint on content_progress for (student_id, content_id)
-- This is needed for the ON CONFLICT clause in the mobile app's markAsComplete function

-- First, remove any duplicate rows that might exist (keep the most recent)
DELETE FROM content_progress a
USING content_progress b
WHERE a.id < b.id
  AND a.student_id = b.student_id
  AND a.content_id = b.content_id;

-- Drop the old constraint if it exists (it was on student_id, content_id, content_type)
ALTER TABLE content_progress DROP CONSTRAINT IF EXISTS content_progress_student_id_content_id_content_type_key;

-- Add the new unique constraint
ALTER TABLE content_progress 
ADD CONSTRAINT content_progress_student_content_unique 
UNIQUE (student_id, content_id);

-- Verify the constraint was added
SELECT conname, contype 
FROM pg_constraint 
WHERE conname LIKE '%content_progress%';
