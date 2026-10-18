-- Add testpress_id column to courses table to store Testpress course IDs
-- This allows mapping between local courses and Testpress courses

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS testpress_id INTEGER UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_courses_testpress_id ON courses(testpress_id);

-- Add comment
COMMENT ON COLUMN courses.testpress_id IS 'ID of the corresponding course in Testpress system';
