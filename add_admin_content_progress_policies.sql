-- Add admin policies for content_progress table
-- This allows admins to view all student progress for statistics

-- Policy for admins to view all content progress
DROP POLICY IF EXISTS "Admins can view all progress" ON content_progress;
CREATE POLICY "Admins can view all progress"
ON content_progress FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM members 
        WHERE email = auth.jwt()->>'email' 
        AND role = 'Admin'
    )
);

-- Policy for admins to insert progress (for manual adjustments if needed)
DROP POLICY IF EXISTS "Admins can insert any progress" ON content_progress;
CREATE POLICY "Admins can insert any progress"
ON content_progress FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM members 
        WHERE email = auth.jwt()->>'email' 
        AND role = 'Admin'
    )
);

-- Policy for admins to update progress (for manual adjustments if needed)
DROP POLICY IF EXISTS "Admins can update any progress" ON content_progress;
CREATE POLICY "Admins can update any progress"
ON content_progress FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM members 
        WHERE email = auth.jwt()->>'email' 
        AND role = 'Admin'
    )
);

-- Policy for admins to delete progress (for cleanup if needed)
DROP POLICY IF EXISTS "Admins can delete any progress" ON content_progress;
CREATE POLICY "Admins can delete any progress"
ON content_progress FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM members 
        WHERE email = auth.jwt()->>'email' 
        AND role = 'Admin'
    )
);
