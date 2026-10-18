-- Enable RLS on posts table (if not already enabled)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to UPDATE posts" ON posts;
DROP POLICY IF EXISTS "Allow authenticated users to SELECT posts" ON posts;
DROP POLICY IF EXISTS "Allow authenticated users to INSERT posts" ON posts;
DROP POLICY IF EXISTS "Allow authenticated users to DELETE posts" ON posts;

-- Grant SELECT access to authenticated users
CREATE POLICY "Allow authenticated users to SELECT posts"
ON posts FOR SELECT
TO authenticated
USING (true);

-- Grant INSERT access to authenticated users
CREATE POLICY "Allow authenticated users to INSERT posts"
ON posts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant UPDATE access to authenticated users (for soft delete and edits)
CREATE POLICY "Allow authenticated users to UPDATE posts"
ON posts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant DELETE access to authenticated users (if hard delete is ever needed)
CREATE POLICY "Allow authenticated users to DELETE posts"
ON posts FOR DELETE
TO authenticated
USING (true);
