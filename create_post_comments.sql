-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Everyone (authenticated) can view comments
CREATE POLICY "Authenticated users can view comments"
ON post_comments FOR SELECT
TO authenticated
USING (true);

-- 2. Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
ON post_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON post_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Admins can delete any comment
-- (Assuming admin check is done via a separate function or role check, 
--  but for simplicity here we'll use the public.is_admin() function if it exists, 
--  or check against a known admin table/claim. 
--  Let's check if is_admin function exists first. If not, we might need a more robust policy.
--  For now, let's stick to a basic policy and we can refine if needed.)

-- Let's try to use the existing admin check pattern if possible.
-- Checking previous SQL files, it seems we often use a specific role or just rely on app logic for admins.
-- But for RLS, we need it in SQL.
-- Let's add a policy for admins if they have a specific claim or role.
-- For now, I'll add a policy that allows deletion if the user is the post owner (optional) or just stick to user deletion.
-- Wait, the requirement says "Admins can view all comments, Delete any comment".

-- Let's assume there is an `is_admin` function or we can check the `members` table for role.
-- Based on previous context, there is a `members` table with `role`.

CREATE POLICY "Admins can delete any comment"
ON post_comments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.user_id = auth.uid() 
    AND members.role IN ('admin', 'super_admin')
  )
);
