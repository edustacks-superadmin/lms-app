-- Fix enrollments.student_id to use integer instead of UUID
-- This matches the members.id type (integer)

-- Step 1: Drop existing foreign key constraint if it exists
ALTER TABLE enrollments 
DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;

-- Step 2: Drop the existing student_id column
ALTER TABLE enrollments 
DROP COLUMN IF EXISTS student_id;

-- Step 3: Add student_id as integer with foreign key to members
ALTER TABLE enrollments 
ADD COLUMN student_id integer REFERENCES members(id) ON DELETE CASCADE;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'enrollments' AND column_name = 'student_id';
