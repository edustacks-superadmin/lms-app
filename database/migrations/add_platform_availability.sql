-- Migration: Add platform availability to courses
-- Date: 2025-12-25
-- Description: Add platform_availability column to enable platform-exclusive content

-- Add platform_availability column as JSONB object
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS platform_availability JSONB 
DEFAULT '{"web": true, "mobile": true, "desktop": true}'::JSONB;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_courses_platform_availability 
ON courses USING GIN (platform_availability);

-- Update existing courses to allow all platforms (if column was null)
UPDATE courses 
SET platform_availability = '{"web": true, "mobile": true, "desktop": true}'::JSONB
WHERE platform_availability IS NULL;

-- Add comment
COMMENT ON COLUMN courses.platform_availability IS 
'Object indicating platform accessibility: {"web": boolean, "mobile": boolean, "desktop": boolean}';
