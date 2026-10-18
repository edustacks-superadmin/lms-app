-- Notification logs table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL, -- 'exam', 'post', 'manual'
    channel TEXT NOT NULL DEFAULT 'push', -- 'push', 'email', 'both'
    title TEXT,
    body TEXT,
    recipients_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'success', -- 'success', 'partial', 'failed'
    reference_id INTEGER, -- exam_id or post_id if applicable
    reference_type TEXT, -- 'exam' or 'post'
    metadata JSONB,
    institute_id BIGINT DEFAULT 10,
    created_by INTEGER -- member_id of admin who sent manual notification
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_institute ON notification_logs(institute_id);

-- RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view logs
CREATE POLICY "Admins can view notification logs" ON notification_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE members.id = auth.uid()::integer 
            AND members.role IN ('admin', 'superadmin')
        )
    );

-- Policy for service role to insert
CREATE POLICY "Service role can insert logs" ON notification_logs
    FOR INSERT WITH CHECK (true);
