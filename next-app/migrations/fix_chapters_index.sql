-- Drop the partial unique index
DROP INDEX IF EXISTS chapters_testpress_id_unique;

-- Create standard unique index (Postgres allows multiple NULLs in UNIQUE index)
CREATE UNIQUE INDEX IF NOT EXISTS chapters_testpress_id_unique 
ON chapters(testpress_id);
