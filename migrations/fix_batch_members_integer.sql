-- Fix batch_members table to use INTEGER instead of UUID for member_id

-- Drop existing table
DROP TABLE IF EXISTS batch_members CASCADE;

-- Recreate with correct schema
CREATE TABLE batch_members (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(batch_id, member_id)
);

-- Add index for performance
CREATE INDEX idx_batch_members_batch_id ON batch_members(batch_id);
CREATE INDEX idx_batch_members_member_id ON batch_members(member_id);

-- Success message
SELECT 'batch_members table fixed with INTEGER member_id!' as message;
