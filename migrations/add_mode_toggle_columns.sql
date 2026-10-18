-- Add allow_mode_toggle to exams
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS allow_mode_toggle BOOLEAN DEFAULT FALSE;

-- Add is_quiz_mode to exam_sessions to persist choice during the exam
ALTER TABLE exam_sessions 
ADD COLUMN IF NOT EXISTS is_quiz_mode BOOLEAN DEFAULT FALSE;

-- Add is_quiz_mode to exam_attempts to record how the exam was taken
ALTER TABLE exam_attempts 
ADD COLUMN IF NOT EXISTS is_quiz_mode BOOLEAN DEFAULT FALSE;
