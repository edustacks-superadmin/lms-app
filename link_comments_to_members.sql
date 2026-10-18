-- Ensure user_id in members is unique (required for FK target)
-- We use DO block to avoid error if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'members_user_id_key'
    ) THEN
        ALTER TABLE members ADD CONSTRAINT members_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Update post_comments FK to reference members instead of auth.users
-- This allows Supabase to join post_comments with members automatically
ALTER TABLE post_comments
DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;

ALTER TABLE post_comments
ADD CONSTRAINT post_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES members(user_id)
ON DELETE CASCADE;
