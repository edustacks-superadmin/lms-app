-- Add member_id column to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS member_id bigint REFERENCES members(id);

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id ON subscriptions(member_id);
