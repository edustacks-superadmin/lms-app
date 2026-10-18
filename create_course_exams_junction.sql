-- Create course_exams junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS course_exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, exam_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_course_exams_course_id ON course_exams(course_id);
CREATE INDEX idx_course_exams_exam_id ON course_exams(exam_id);

-- Migrate existing data from exams.course_id to course_exams table
INSERT INTO course_exams (course_id, exam_id)
SELECT course_id, id
FROM exams
WHERE course_id IS NOT NULL
ON CONFLICT (course_id, exam_id) DO NOTHING;

-- Optional: You can keep the course_id column in exams for backward compatibility
-- or remove it after migration is complete
-- ALTER TABLE exams DROP COLUMN course_id;
