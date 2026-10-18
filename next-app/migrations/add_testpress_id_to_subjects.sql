-- Migration: Add testpress_id to subjects
-- Description: Adds testpress_id column to subjects table for mapping

-- Add testpress_id column
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS testpress_id INT;

-- Add unique constraint
ALTER TABLE subjects 
ADD CONSTRAINT IF NOT EXISTS subjects_testpress_id_unique UNIQUE (testpress_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subjects_testpress_id ON subjects(testpress_id);

-- Add comment
COMMENT ON COLUMN subjects.testpress_id IS 'Original Testpress subject ID for tracking';
