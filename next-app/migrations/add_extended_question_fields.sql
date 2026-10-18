-- Migration: Add extended question fields
-- Description: Adds question_type, marks, negative_marks, hints, and case_sensitive columns

-- Add question_type column
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS question_type VARCHAR(50);

-- Add marks column (default 1.0 for MCQ)
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS marks DECIMAL(5, 2) DEFAULT 1.0;

-- Add negative_marks column
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS negative_marks DECIMAL(5, 2) DEFAULT 0.0;

-- Add hint columns
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS hint1 TEXT;

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS hint2 TEXT;

-- Add case_sensitive column (for fill-in-the-blank questions)
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS case_sensitive BOOLEAN DEFAULT false;

-- Add show_explanation_only_after column
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS show_explanation_only_after BOOLEAN DEFAULT false;

-- Create index on question_type for filtering
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);

-- Add comment to track migration
COMMENT ON COLUMN questions.question_type IS 'Type of question: MCQ, Fill in the Blank, etc.';
COMMENT ON COLUMN questions.marks IS 'Marks awarded for correct answer';
COMMENT ON COLUMN questions.negative_marks IS 'Marks deducted for wrong answer';
