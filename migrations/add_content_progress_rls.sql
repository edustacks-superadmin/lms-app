-- Add RLS policy to allow users to read their own content progress
-- This allows the mobile app to fetch and update completion status

-- Enable RLS if not already enabled
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own content progress" ON content_progress;
DROP POLICY IF EXISTS "Users can insert their own content progress" ON content_progress;
DROP POLICY IF EXISTS "Users can update their own content progress" ON content_progress;

-- Policy 1: Allow users to view their own progress
CREATE POLICY "Users can view their own content progress"
ON content_progress
FOR SELECT
TO authenticated
USING (
    member_id IN (
        SELECT id FROM members 
        WHERE auth_user_id = auth.uid() 
        OR email = auth.jwt()->>'email'
    )
);

-- Policy 2: Allow users to insert their own progress
CREATE POLICY "Users can insert their own content progress"
ON content_progress
FOR INSERT
TO authenticated
WITH CHECK (
    member_id IN (
        SELECT id FROM members 
        WHERE auth_user_id = auth.uid() 
        OR email = auth.jwt()->>'email'
    )
);

-- Policy 3: Allow users to update their own progress
CREATE POLICY "Users can update their own content progress"
ON content_progress
FOR UPDATE
TO authenticated
USING (
    member_id IN (
        SELECT id FROM members 
        WHERE auth_user_id = auth.uid() 
        OR email = auth.jwt()->>'email'
    )
);

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'content_progress';
