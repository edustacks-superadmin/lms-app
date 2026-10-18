-- Enable RLS
ALTER TABLE question_bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON question_bookmarks;
DROP POLICY IF EXISTS "Users can add their own bookmarks" ON question_bookmarks;
DROP POLICY IF EXISTS "Users can remove their own bookmarks" ON question_bookmarks;

-- Create policies
CREATE POLICY "Users can view their own bookmarks"
ON question_bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own bookmarks"
ON question_bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own bookmarks"
ON question_bookmarks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
