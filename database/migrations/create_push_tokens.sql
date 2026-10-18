-- Push Tokens Table
-- Stores Expo push notification tokens for mobile app users

CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    member_id INT REFERENCES members(id) ON DELETE CASCADE,
    expo_push_token VARCHAR(255) NOT NULL,
    device_type VARCHAR(50), -- 'ios' or 'android'
    device_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(member_id, expo_push_token)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_member ON push_tokens(member_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to push_tokens table
CREATE TRIGGER update_push_tokens_modtime
    BEFORE UPDATE ON push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Notifications Log Table (optional - for tracking sent notifications)
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    content_id INT REFERENCES chapter_contents(id) ON DELETE SET NULL,
    course_id INT REFERENCES courses(id) ON DELETE SET NULL,
    sent_by INT REFERENCES members(id) ON DELETE SET NULL,
    notification_type VARCHAR(50), -- 'email', 'push', 'both'
    subject VARCHAR(500),
    body TEXT,
    recipients_count INT DEFAULT 0,
    email_sent_count INT DEFAULT 0,
    push_sent_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for push_tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Helper function to get current member_id
CREATE OR REPLACE FUNCTION current_member_id()
RETURNS INT AS $$
  SELECT id FROM members WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Users can view their own tokens
CREATE POLICY "Users can view own push tokens" ON push_tokens
    FOR SELECT USING (member_id = current_member_id());

-- Users can insert their own tokens
CREATE POLICY "Users can insert own push tokens" ON push_tokens
    FOR INSERT WITH CHECK (member_id = current_member_id());

-- Users can update their own tokens
CREATE POLICY "Users can update own push tokens" ON push_tokens
    FOR UPDATE USING (member_id = current_member_id());

-- Users can delete their own tokens
CREATE POLICY "Users can delete own push tokens" ON push_tokens
    FOR DELETE USING (member_id = current_member_id());

-- Admin can read all tokens (for sending notifications)
CREATE POLICY "Admins can view all push tokens" ON push_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'staff')
        )
    );

-- RLS for notification_logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage notification logs
CREATE POLICY "Admins can manage notification logs" ON notification_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'staff')
        )
    );
