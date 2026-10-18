-- DEBUG: ALLOW ALL AUTHENTICATED ACCESS TO CONTENT_PROGRESS
-- This removes the strict "view own data" check and just allows any logged-in user to see the table.
-- Use this to confirm if the previous policy was too strict or broken.

ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own content progress" ON content_progress;
DROP POLICY IF EXISTS "Debug Public Access" ON content_progress;

CREATE POLICY "Debug Public Access"
ON content_progress
FOR SELECT
TO authenticated
USING (true);  -- <--- ALLOW EVERYTHING

-- Grant permissions explicitly
GRANT ALL ON content_progress TO authenticated;
GRANT ALL ON content_progress TO service_role;
