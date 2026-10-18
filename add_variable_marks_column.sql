--human Migration: Add variable_marks column to exams table
-- This column determines if the exam uses fixed marks per question or variable marks

-- Add the variable_marks column (defaults to false for existing exams)
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS variable_marks BOOLEAN DEFAULT FALSE;

-- Add a comment to describe the column
COMMENT ON COLUMN exams.variable_marks IS 'TRUE = Each question has individual marks (calculated from questions.marks), FALSE = All questions have same marks (uses marks_per_question)';

-- Optional: Update existing exams based on whether they have questions with varying marks
-- This finds exams where questions have different marks and sets variable_marks = true
UPDATE exams e
SET variable_marks = TRUE
WHERE EXISTS (
    SELECT 1
    FROM exam_questions eq
    JOIN questions q ON eq.question_id = q.id
    WHERE eq.exam_id = e.id
    GROUP BY eq.exam_id
    HAVING COUNT(DISTINCT q.marks) > 1
);
