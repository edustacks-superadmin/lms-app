-- Exam Enhancement Features Migration
-- Add new columns to exams table for advanced features

-- Step 1: Add new columns to exams table
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS randomize_options BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_submit_on_timeout BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS negative_marking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS negative_marks_per_question DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS detect_tab_switch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS restrict_copy_paste BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS attempt_gap_minutes INTEGER DEFAULT 0;

-- Step 2: Add new columns to existing exam_attempts table
ALTER TABLE exam_attempts
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS questions_answered JSONB,
ADD COLUMN IF NOT EXISTS tab_switches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_auto_submitted BOOLEAN DEFAULT false;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_user ON exam_attempts(exam_id, user_id);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN exams.randomize_questions IS 'If true, shuffle question order for each student';
COMMENT ON COLUMN exams.randomize_options IS 'If true, shuffle MCQ options for each question';
COMMENT ON COLUMN exams.auto_submit_on_timeout IS 'Automatically submit exam when time expires';
COMMENT ON COLUMN exams.negative_marking_enabled IS 'Enable negative marking for wrong answers';
COMMENT ON COLUMN exams.negative_marks_per_question IS 'Marks to deduct per wrong answer';
COMMENT ON COLUMN exams.detect_tab_switch IS 'Track when student switches tabs/windows';
COMMENT ON COLUMN exams.restrict_copy_paste IS 'Disable copy/paste during exam';
COMMENT ON COLUMN exams.max_attempts IS 'Maximum number of attempts allowed (0 = unlimited)';
COMMENT ON COLUMN exams.attempt_gap_minutes IS 'Minimum minutes between attempts';

COMMENT ON COLUMN exam_attempts.attempt_number IS 'Sequential attempt number for this user and exam';
COMMENT ON COLUMN exam_attempts.questions_answered IS 'JSON object storing student answers for each question';
COMMENT ON COLUMN exam_attempts.tab_switches IS 'Number of times student switched tabs during exam';
COMMENT ON COLUMN exam_attempts.is_auto_submitted IS 'True if exam was auto-submitted due to timeout';
