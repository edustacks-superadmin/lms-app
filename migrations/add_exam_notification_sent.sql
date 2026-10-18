-- Add notification_sent column to exams table
-- This prevents duplicate scheduled notifications

ALTER TABLE exams ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Add index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_exams_notification_pending 
ON exams (start_date, notification_sent) 
WHERE notification_sent = FALSE AND start_date IS NOT NULL;

COMMENT ON COLUMN exams.notification_sent IS 'Tracks if scheduled notification has been sent when exam starts';
