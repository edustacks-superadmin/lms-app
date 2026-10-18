-- Add course_id column to exams table to link exams with courses
ALTER TABLE exams 
ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- Create an index for faster queries
CREATE INDEX idx_exams_course_id ON exams(course_id);

-- Optional: Update existing exams to link them to a course
-- You'll need to manually set course_id for existing exams
-- Example:
-- UPDATE exams SET course_id = 'your-course-id' WHERE id = 'exam-id';
