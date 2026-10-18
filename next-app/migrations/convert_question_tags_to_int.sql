-- Migration: Change question_tags.question_id from UUID to Integer
-- This aligns with the questions table which uses Integer IDs

-- Step 1: Drop the existing index
DROP INDEX IF EXISTS idx_question_tags_question;

-- Step 2: Alter the column type
ALTER TABLE question_tags 
ALTER COLUMN question_id TYPE INTEGER USING NULL;

-- Step 3: Recreate the index
CREATE INDEX idx_question_tags_question ON question_tags(question_id);

-- Step 4: Add foreign key constraint for data integrity
ALTER TABLE question_tags
ADD CONSTRAINT fk_question_tags_question 
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
