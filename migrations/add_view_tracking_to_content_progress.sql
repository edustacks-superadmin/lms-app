-- Migration 2: Add view tracking columns to content_progress table
-- This tracks individual video view counts and total watch time per student

-- Add tracking columns
ALTER TABLE content_progress 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_watch_seconds DECIMAL(10,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN content_progress.view_count IS 'Number of times this content has been viewed/started by the student';
COMMENT ON COLUMN content_progress.total_watch_seconds IS 'Total seconds watched for this content by the student (cumulative across all sessions)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_progress_view_count ON content_progress(view_count);
CREATE INDEX IF NOT EXISTS idx_content_progress_watch_time ON content_progress(total_watch_seconds);

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'content_progress' 
AND column_name IN ('view_count', 'total_watch_seconds');
