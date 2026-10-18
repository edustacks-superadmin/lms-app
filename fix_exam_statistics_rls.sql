-- Drop restrictive policies
DROP POLICY IF EXISTS "Users can view their own attempts" ON exam_attempts;
DROP POLICY IF EXISTS "Users can view their own answers" ON exam_answers;

-- Drop permissive policies if they already exist (to allow re-running this script)
DROP POLICY IF EXISTS "Enable read access for all users" ON exam_attempts;
DROP POLICY IF EXISTS "Enable read access for all answers" ON exam_answers;

-- Create permissive policies for reading (allows admins/teachers to see all attempts)
CREATE POLICY "Enable read access for all users" 
ON exam_attempts FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all answers" 
ON exam_answers FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create permissive policy for members (to see student names)
DROP POLICY IF EXISTS "Enable read access for all members" ON members;
CREATE POLICY "Enable read access for all members" 
ON members FOR SELECT 
USING (auth.role() = 'authenticated');
