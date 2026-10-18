-- Create content_progress table for tracking PDFs, videos, and exams
CREATE TABLE IF NOT EXISTS content_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('pdf', 'video', 'exam')),
    content_id UUID NOT NULL,
    content_title TEXT,
    completed BOOLEAN DEFAULT false,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, content_id, content_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_progress_student ON content_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_content_progress_course ON content_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_content_progress_completed ON content_progress(student_id, course_id, completed);

-- Enable RLS
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Students can view their own progress" ON content_progress;
CREATE POLICY "Students can view their own progress"
ON content_progress FOR SELECT
TO authenticated
USING (
    student_id IN (
        SELECT id FROM members WHERE email = auth.jwt()->>'email'
    )
);

DROP POLICY IF EXISTS "Students can insert their own progress" ON content_progress;
CREATE POLICY "Students can insert their own progress"
ON content_progress FOR INSERT
TO authenticated
WITH CHECK (
    student_id IN (
        SELECT id FROM members WHERE email = auth.jwt()->>'email'
    )
);

DROP POLICY IF EXISTS "Students can update their own progress" ON content_progress;
CREATE POLICY "Students can update their own progress"
ON content_progress FOR UPDATE
TO authenticated
USING (
    student_id IN (
        SELECT id FROM members WHERE email = auth.jwt()->>'email'
    )
);

-- Comments
COMMENT ON TABLE content_progress IS 'Tracks individual content item completion (PDFs, videos, exams)';
COMMENT ON COLUMN content_progress.content_type IS 'Type of content: pdf, video, or exam';
COMMENT ON COLUMN content_progress.completion_percentage IS 'Percentage complete (0-100), used for video watch progress or exam scores';
