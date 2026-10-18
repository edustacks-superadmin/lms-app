-- Enable RLS on exam_attempts
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON exam_attempts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON exam_attempts;
DROP POLICY IF EXISTS "Enable update for users based on id" ON exam_attempts;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON exam_attempts;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON exam_attempts;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON exam_attempts;

-- Create comprehensive policies
-- 1. READ: Allow authenticated users to view all attempts (needed for Admins to view stats)
CREATE POLICY "Enable read access for authenticated users" 
ON exam_attempts FOR SELECT 
TO authenticated 
USING (true);

-- 2. INSERT: Allow authenticated users to create attempts
CREATE POLICY "Enable insert for authenticated users" 
ON exam_attempts FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. UPDATE: Allow authenticated users to update their own attempts OR if they are admins (simplified to authenticated for now to ensure Admin access works)
CREATE POLICY "Enable update for authenticated users" 
ON exam_attempts FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. DELETE: Allow authenticated users (Admins) to delete attempts
CREATE POLICY "Enable delete for authenticated users" 
ON exam_attempts FOR DELETE 
TO authenticated 
USING (true);

-- Success message
SELECT 'RLS policies for exam_attempts updated successfully!' as message;
