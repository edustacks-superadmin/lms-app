-- Fix UUID/Integer mismatches for Exam relations
-- These tables use UUIDs for columns that should reference Integer IDs.

-- 1. Fix course_exams
-- course_id (UUID -> Integer), exam_id (UUID -> Integer)
ALTER TABLE course_exams DROP COLUMN IF EXISTS course_id;
ALTER TABLE course_exams DROP COLUMN IF EXISTS exam_id;

ALTER TABLE course_exams ADD COLUMN course_id integer REFERENCES courses(id);
ALTER TABLE course_exams ADD COLUMN exam_id integer 
 exams(id);

CREATE INDEX IF NOT EXISTS idx_course_exams_course_id ON course_exams(course_id);
CREATE INDEX IF NOT EXISTS idx_course_exams_exam_id ON course_exams(exam_id);

-- 2. Fix exam_questions
-- exam_id (UUID -> Integer), question_id (UUID -> Integer)
-- Note: section_id is UUID (exam_sections), so that is correct.
ALTER TABLE exam_questions DROP COLUMN IF EXISTS exam_id;
ALTER TABLE exam_questions DROP COLUMN IF EXISTS question_id;

ALTER TABLE exam_questions ADD COLUMN exam_id integer REFERENCES exams(id);
ALTER TABLE exam_questions ADD COLUMN question_id integer REFERENCES questions(id);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);

-- 3. Fix exam_answers
-- attempt_id (UUID -> Integer), question_id (UUID -> Integer)
ALTER TABLE exam_answers DROP COLUMN IF EXISTS attempt_id;
ALTER TABLE exam_answers DROP COLUMN IF EXISTS question_id;

ALTER TABLE exam_answers ADD COLUMN attempt_id integer REFERENCES exam_attempts(id);
ALTER TABLE exam_answers ADD COLUMN question_id integer REFERENCES questions(id);

CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON exam_answers(attempt_id);
