-- Add columns to track the last accessed content for a student in a course
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS last_accessed_chapter_id UUID REFERENCES chapters(id),
ADD COLUMN IF NOT EXISTS last_accessed_content_id UUID REFERENCES chapter_contents(id),
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT NOW();
