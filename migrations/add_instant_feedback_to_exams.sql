-- Add enable_instant_feedback column to exams table
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS enable_instant_feedback BOOLEAN DEFAULT FALSE;

-- Update RLS policies if necessary (usually specific columns don't need new policies if the table is already accessible)
-- But we might want to check if we can select it. content_progress table references it so we should be good.
