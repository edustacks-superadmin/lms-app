-- Add testpress_id column to exams table for Testpress integration
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS testpress_id INTEGER UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exams_testpress_id ON exams(testpress_id);

-- Add comment
COMMENT ON COLUMN exams.testpress_id IS 'Testpress exam ID for synchronization';
