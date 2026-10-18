-- Discussion Forum Tables Migration

-- 1. Create discussion_threads table
CREATE TABLE IF NOT EXISTS discussion_threads (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    institute_id BIGINT REFERENCES institute_settings(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    reply_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create discussion_replies table
CREATE TABLE IF NOT EXISTS discussion_replies (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER REFERENCES discussion_threads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_discussion_threads_institute ON discussion_threads(institute_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_member ON discussion_threads(member_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_activity ON discussion_threads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_thread ON discussion_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_member ON discussion_replies(member_id);

-- 4. Enable RLS
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for discussion_threads
-- Allow anyone to read non-deleted threads, and admins to read all
CREATE POLICY "Read threads policy"
ON discussion_threads FOR SELECT
USING (
    is_deleted = FALSE 
    OR 
    EXISTS (
        SELECT 1 FROM members 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Allow authenticated members to create threads
CREATE POLICY "Insert threads policy"
ON discussion_threads FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authors and admins to update threads
CREATE POLICY "Update threads policy"
ON discussion_threads FOR UPDATE
USING (
    member_id IN (SELECT id FROM members WHERE auth_user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM members WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
)
WITH CHECK (
    member_id IN (SELECT id FROM members WHERE auth_user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM members WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Allow authors and admins to delete threads
CREATE POLICY "Delete threads policy"
ON discussion_threads FOR DELETE
USING (
    member_id IN (SELECT id FROM members WHERE auth_user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM members WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 6. RLS Policies for discussion_replies
-- Allow anyone to read non-deleted replies, and admins to read all
CREATE POLICY "Read replies policy"
ON discussion_replies FOR SELECT
USING (
    is_deleted = FALSE 
    OR 
    EXISTS (
        SELECT 1 FROM members 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Allow authenticated members to create replies
CREATE POLICY "Insert replies policy"
ON discussion_replies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authors and admins to update replies
CREATE POLICY "Update replies policy"
ON discussion_replies FOR UPDATE
USING (
    member_id IN (SELECT id FROM members WHERE auth_user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM members WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
)
WITH CHECK (
    member_id IN (SELECT id FROM members WHERE auth_user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM members WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Allow authors and admins to delete replies
CREATE POLICY "Delete replies policy"
ON discussion_replies FOR DELETE
USING (
    member_id IN (SELECT id FROM members WHERE auth_user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM members WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 7. Function to update reply_count and last_activity_at
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE discussion_threads
        SET reply_count = reply_count + 1,
            last_activity_at = NOW()
        WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE discussion_threads
        SET reply_count = GREATEST(reply_count - 1, 0)
        WHERE id = OLD.thread_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger for reply stats
DROP TRIGGER IF EXISTS trg_update_thread_stats ON discussion_replies;
CREATE TRIGGER trg_update_thread_stats
AFTER INSERT OR DELETE ON discussion_replies
FOR EACH ROW
EXECUTE FUNCTION update_thread_stats();
