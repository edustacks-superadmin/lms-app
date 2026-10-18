-- RESTORE ACCESS TO CONTENT_PROGRESS
-- Run this script in Supabase SQL Editor to fix the "missing resume items" issue.

-- 1. Ensure RLS is enabled
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own content progress" ON content_progress;
DROP POLICY IF EXISTS "Users can insert their own content progress" ON content_progress;
DROP POLICY IF EXISTS "Users can update their own content progress" ON content_progress;

-- 3. Re-create the SELECT policy (Crucial for Dashboard)
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

-- 4. Re-create INSERT/UPDATE policies
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

-- 5. Grant permissions just in case
GRANT ALL ON content_progress TO authenticated;
GRANT ALL ON content_progress TO service_role;
