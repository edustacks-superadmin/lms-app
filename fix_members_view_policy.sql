-- Allow all authenticated users to view members
-- This is required so students can see the names/photos of other users (and admins) in the comments section.
CREATE POLICY "Allow all authenticated users to view members"
ON members FOR SELECT
TO authenticated
USING (true);
