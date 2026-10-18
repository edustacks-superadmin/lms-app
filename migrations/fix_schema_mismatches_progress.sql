-- Fix UUID/Integer mismatches for Learning Progress tables
-- These tables use UUIDs for columns that should reference Integer IDs.

-- 1. Fix enrollments
-- course_id (UUID -> Integer), last_accessed_chapter_id (UUID -> Integer), last_accessed_content_id (UUID -> Integer)
ALTER TABLE enrollments DROP COLUMN IF EXISTS course_id;
ALTER TABLE enrollments DROP COLUMN IF EXISTS last_accessed_chapter_id;
ALTER TABLE enrollments DROP COLUMN IF EXISTS last_accessed_content_id;

ALTER TABLE enrollments ADD COLUMN course_id integer REFERENCES courses(id);
ALTER TABLE enrollments ADD COLUMN last_accessed_chapter_id integer REFERENCES chapters(id);
ALTER TABLE enrollments ADD COLUMN last_accessed_content_id integer REFERENCES chapter_contents(id);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);

-- 2. Fix content_progress
-- course_id (UUID -> Integer), chapter_id (UUID -> Integer), content_id (UUID -> Integer)
-- Note: student_id is likely correct as UUID (auth.users)
ALTER TABLE content_progress DROP COLUMN IF EXISTS course_id;
ALTER TABLE content_progress DROP COLUMN IF EXISTS chapter_id;
ALTER TABLE content_progress DROP COLUMN IF EXISTS content_id;

ALTER TABLE content_progress ADD COLUMN course_id integer REFERENCES courses(id);
ALTER TABLE content_progress ADD COLUMN chapter_id integer REFERENCES chapters(id);
-- content_id is polymorphic (could be chapter_contents or exams), so we can't add a simple FK easily without more logic.
-- But it should be Integer to match the IDs of those tables.
ALTER TABLE content_progress ADD COLUMN content_id integer; 

CREATE INDEX IF NOT EXISTS idx_content_progress_course_id ON content_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_content_progress_content_id ON content_progress(content_id);

-- 3. Fix lesson_progress
-- lesson_id (UUID -> Integer) - assuming lesson_id refers to chapter_contents(id)
ALTER TABLE lesson_progress DROP COLUMN IF EXISTS lesson_id;
ALTER TABLE lesson_progress ADD COLUMN lesson_id integer REFERENCES chapter_contents(id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
