-- Add testpress_id column to members table for Testpress user mapping
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS testpress_id INTEGER UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_members_testpress_id ON members(testpress_id);

-- Add comment
COMMENT ON COLUMN members.testpress_id IS 'ID of the corresponding user in Testpress system';
