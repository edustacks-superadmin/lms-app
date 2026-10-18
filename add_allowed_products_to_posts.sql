
-- Add allowed_products column to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS allowed_products UUID[] DEFAULT '{}';

-- Comment on column
COMMENT ON COLUMN posts.allowed_products IS 'Array of product IDs that have access to this post';
