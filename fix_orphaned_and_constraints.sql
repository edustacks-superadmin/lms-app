-- 1. Clean up orphaned bookmarks (bookmarks pointing to deleted questions)
DELETE FROM question_bookmarks
WHERE question_id NOT IN (SELECT id FROM questions);

-- 2. Clean up orphaned reports (reports pointing to deleted questions)
DELETE FROM question_reports
WHERE question_id NOT IN (SELECT id FROM questions);

-- 3. Fix question_bookmarks constraint
ALTER TABLE question_bookmarks
DROP CONSTRAINT IF EXISTS question_bookmarks_question_id_fkey;

ALTER TABLE question_bookmarks
ADD CONSTRAINT question_bookmarks_question_id_fkey
FOREIGN KEY (question_id)
REFERENCES questions(id)
ON DELETE CASCADE;

-- 4. Fix question_reports constraint
ALTER TABLE question_reports
DROP CONSTRAINT IF EXISTS question_reports_question_id_fkey;

ALTER TABLE question_reports
ADD CONSTRAINT question_reports_question_id_fkey
FOREIGN KEY (question_id)
REFERENCES questions(id)
ON DELETE CASCADE;
