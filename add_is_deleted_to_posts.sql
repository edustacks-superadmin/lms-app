-- Add is_deleted column to posts table for soft delete functionality
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Add index for better query performance when filtering deleted posts
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON posts(is_deleted);

-- Comment on column
COMMENT ON COLUMN posts.is_deleted IS 'Flag to mark posts as deleted (soft delete)';
