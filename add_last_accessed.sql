ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS last_accessed_chapter_id UUID REFERENCES chapters(id);

-- Also add a completed_chapters array or jsonb if we want to track individual chapter completion
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS completed_chapters JSONB DEFAULT '[]'::jsonb;
