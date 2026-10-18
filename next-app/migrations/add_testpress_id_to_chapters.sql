-- Add testpress_id column to chapters table for syncing
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS testpress_id INTEGER;

-- Create unique index to prevent duplicate testpress chapters
CREATE UNIQUE INDEX IF NOT EXISTS chapters_testpress_id_unique 
ON chapters(testpress_id) WHERE testpress_id IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS chapters_testpress_id_idx ON chapters(testpress_id);
