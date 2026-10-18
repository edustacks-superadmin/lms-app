-- Fix batch_id type in subscriptions table
-- It was incorrectly defined as UUID, but batches.id is Integer.

-- 1. Drop the incorrect UUID column
ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS batch_id;

-- 2. Add the correct Integer column with Foreign Key
ALTER TABLE subscriptions 
ADD COLUMN batch_id integer REFERENCES batches(id);

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_batch_id_int ON subscriptions(batch_id);
