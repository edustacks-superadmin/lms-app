-- Add parent_id column to subjects table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'parent_id') THEN
        ALTER TABLE subjects ADD COLUMN parent_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
    END IF;
END $$;
