ALTER TABLE chapter_contents ADD COLUMN IF NOT EXISTS testpress_id INT;
ALTER TABLE chapter_contents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE chapter_contents ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE chapter_contents ADD COLUMN IF NOT EXISTS free_preview BOOLEAN DEFAULT false;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chapter_contents_testpress_id') THEN
        CREATE UNIQUE INDEX idx_chapter_contents_testpress_id ON chapter_contents(testpress_id);
    END IF;
END $$;

ALTER TABLE exams ADD COLUMN IF NOT EXISTS testpress_id INT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exams_testpress_id') THEN
        CREATE UNIQUE INDEX idx_exams_testpress_id ON exams(testpress_id);
    END IF;
END $$;
