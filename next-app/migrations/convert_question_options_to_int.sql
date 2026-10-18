-- Migration: Change question_options.question_id from UUID to Integer
-- This aligns with the questions table which uses Integer IDs

-- Step 1: Drop existing foreign key constraint if any
-- (Assuming no formal FK constraint exists based on schema)

-- Step 2: Drop the existing index
DROP INDEX IF EXISTS idx_question_options_question;

-- Step 3: Alter the column type
ALTER TABLE question_options 
ALTER COLUMN question_id TYPE INTEGER USING NULL;

-- Step 4: Recreate the index
CREATE INDEX idx_question_options_question ON question_options(question_id);

-- Step 5: Add foreign key constraint for data integrity
ALTER TABLE question_options
ADD CONSTRAINT fk_question_options_question 
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
