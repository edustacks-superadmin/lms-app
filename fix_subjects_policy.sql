-- Enable RLS on subjects table if not already enabled
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON subjects;

-- Create policy to allow all authenticated users to view subjects
CREATE POLICY "Authenticated users can view subjects"
ON subjects FOR SELECT
TO authenticated
USING (true);
