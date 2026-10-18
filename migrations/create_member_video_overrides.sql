-- Migration 3: Create member_video_overrides table
-- This allows admins to grant unlimited video access to specific students

-- Create the table
CREATE TABLE IF NOT EXISTS member_video_overrides (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unlimited_views BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by_auth_id UUID,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(member_id, course_id)
);

-- Add comments
COMMENT ON TABLE member_video_overrides IS 'Allows admins to grant unlimited video access to specific students for specific courses';
COMMENT ON COLUMN member_video_overrides.unlimited_views IS 'If true, student has unlimited views regardless of course restrictions';
COMMENT ON COLUMN member_video_overrides.notes IS 'Optional admin notes about why override was granted';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_overrides_member ON member_video_overrides(member_id);
CREATE INDEX IF NOT EXISTS idx_video_overrides_course ON member_video_overrides(course_id);

-- Enable RLS
ALTER TABLE member_video_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view overrides (simplified for now)
-- TODO: Restrict to admins only once admin role system is clarified
CREATE POLICY "Allow authenticated read access"
ON member_video_overrides
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can manage overrides (simplified for now)
-- TODO: Restrict to admins only once admin role system is clarified
CREATE POLICY "Allow authenticated write access"
ON member_video_overrides
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'member_video_overrides';

