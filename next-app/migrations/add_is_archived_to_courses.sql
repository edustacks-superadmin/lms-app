-- Add is_archived column to courses table for soft delete (Archive) functionality
-- Run this migration in your Supabase SQL Editor

-- Add the is_archived column with default value false
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add an index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_courses_is_archived ON public.courses(is_archived);

-- Add archived_at timestamp to track when a course was archived
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Comment on the new columns
COMMENT ON COLUMN public.courses.is_archived IS 'Whether the course is archived (soft deleted)';
COMMENT ON COLUMN public.courses.archived_at IS 'Timestamp when the course was archived';
