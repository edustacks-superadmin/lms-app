-- Create exam_sessions table for persisting exam state
CREATE TABLE IF NOT EXISTS exam_sessions (
    id SERIAL PRIMARY KEY,
    exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    
    -- Session state
    answers JSONB DEFAULT '{}', -- { "questionId": optionIndex }
    marked_questions INT[] DEFAULT '{}', -- Array of marked question indices
    current_question_index INT DEFAULT 0,
    time_left INT NOT NULL, -- Seconds remaining
    is_paused BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    started_at TIMESTAMP DEFAULT NOW(),
    last_saved_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    
    -- Unique constraint: one active session per student per exam
    UNIQUE(exam_id, member_id),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exam_sessions_lookup ON exam_sessions(exam_id, member_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_member ON exam_sessions(member_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_exam_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exam_sessions_updated_at
    BEFORE UPDATE ON exam_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_sessions_updated_at();

-- Auto-set expires_at (24 hours from last save)
CREATE OR REPLACE FUNCTION set_exam_session_expiry()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expires_at := NEW.last_saved_at + INTERVAL '24 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_exam_session_expiry
    BEFORE INSERT OR UPDATE ON exam_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_exam_session_expiry();

-- Enable RLS
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Students can only access their own sessions
CREATE POLICY "Students can manage own sessions"
    ON exam_sessions
    FOR ALL
    USING (member_id IN (
        SELECT id FROM members WHERE auth_user_id = auth.uid()
    ))
    WITH CHECK (member_id IN (
        SELECT id FROM members WHERE auth_user_id = auth.uid()
    ));

-- RLS Policy: Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
    ON exam_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM members
            WHERE auth_user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Function to clean up expired sessions (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_exam_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM exam_sessions
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
