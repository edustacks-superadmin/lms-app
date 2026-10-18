-- Add notification_sent column to posts table
-- This is needed for the post-notifications cron job

ALTER TABLE posts ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_posts_notification_pending 
ON posts (publication_date, notification_sent) 
WHERE notification_sent = FALSE AND status = 'published';

COMMENT ON COLUMN posts.notification_sent IS 'Tracks if notification has been sent when post is published';
