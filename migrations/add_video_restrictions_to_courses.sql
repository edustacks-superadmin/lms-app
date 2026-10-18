-- Migration 1: Add video restriction columns to courses table
-- This allows admins to set per-video view limits and watch time multipliers

-- Add video restriction columns
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS max_video_views INTEGER NULL,
ADD COLUMN IF NOT EXISTS watch_time_multiplier DECIMAL(3,1) NULL;

-- Add comments for documentation
COMMENT ON COLUMN courses.max_video_views IS 'Maximum number of times each video in the course can be viewed per student. NULL = unlimited';
COMMENT ON COLUMN courses.watch_time_multiplier IS 'Multiplier for total watch time (e.g., 2.0 = student can watch 2x the total course video duration). NULL = unlimited';

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'courses' 
AND column_name IN ('max_video_views', 'watch_time_multiplier');
