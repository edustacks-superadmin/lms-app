-- Enable RLS on questions table if not already enabled
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view questions" ON questions;

-- Create policy to allow all authenticated users to view questions
CREATE POLICY "Authenticated users can view questions"
ON questions FOR SELECT
TO authenticated
USING (true);
