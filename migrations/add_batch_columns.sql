-- Add missing columns to batches table to match Testpress export format
-- This migration adds url, modified, and is_local columns

ALTER TABLE batches
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS modified TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_local BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN batches.url IS 'Testpress API URL for the batch';
COMMENT ON COLUMN batches.modified IS 'Last modification timestamp from Testpress';
COMMENT ON COLUMN batches.is_local IS 'Whether batch was created locally (true) or imported from Testpress (false)';

-- Success message
SELECT 'Batches table updated with url, modified, and is_local columns' as message;
