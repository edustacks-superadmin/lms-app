-- Add scheduling columns to chapter_contents for PDF/video content
-- This enables scheduled release of content with notifications

ALTER TABLE chapter_contents 
ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_chapter_contents_notification_pending 
ON chapter_contents (available_from, notification_sent) 
WHERE notification_sent = FALSE AND available_from IS NOT NULL;

COMMENT ON COLUMN chapter_contents.available_from IS 'When this content becomes available. NULL = immediately available';
COMMENT ON COLUMN chapter_contents.notification_sent IS 'Whether notification has been sent for this content';
