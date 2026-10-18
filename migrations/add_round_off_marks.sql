-- Add round_off_marks field to exams table
-- This field controls whether final marks should be rounded to whole numbers
ALTER TABLE exams ADD COLUMN IF NOT EXISTS round_off_marks BOOLEAN DEFAULT false;

-- Add comment to document field purpose
COMMENT ON COLUMN exams.round_off_marks IS 'Round final marks to nearest whole number (true) or allow decimals (false)';
