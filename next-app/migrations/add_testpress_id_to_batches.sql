-- Add testpress_id column to batches table to store Testpress batch IDs
-- This allows mapping between local batches and Testpress batches

ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS testpress_id INTEGER UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_batches_testpress_id ON batches(testpress_id);

-- Add comment
COMMENT ON COLUMN batches.testpress_id IS 'ID of the corresponding batch in Testpress system';
