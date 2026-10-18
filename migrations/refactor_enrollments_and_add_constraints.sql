-- Comprehensive Schema Migration: Enrollments + Data Integrity
-- Part 1: Rename enrollments.student_id to member_id

-- 1. Rename column in enrollments table
ALTER TABLE public.enrollments 
RENAME COLUMN student_id TO member_id;

-- 2. Enable RLS on enrollments if not already enabled
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 3. Update RLS policies for enrollments
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can insert their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.enrollments;

CREATE POLICY "Users can view their own enrollments" 
ON public.enrollments 
FOR SELECT 
USING (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own enrollments" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own enrollments" 
ON public.enrollments 
FOR UPDATE 
USING (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

-- Part 2: Add Foreign Key Constraints

-- Add FK for content_progress.member_id
ALTER TABLE public.content_progress 
ADD CONSTRAINT fk_content_progress_member 
FOREIGN KEY (member_id) 
REFERENCES public.members(id) 
ON DELETE CASCADE;

-- Add FK for exam_attempts.member_id
ALTER TABLE public.exam_attempts 
ADD CONSTRAINT fk_exam_attempts_member 
FOREIGN KEY (member_id) 
REFERENCES public.members(id) 
ON DELETE CASCADE;

-- Add FK for enrollments.member_id
ALTER TABLE public.enrollments 
ADD CONSTRAINT fk_enrollments_member 
FOREIGN KEY (member_id) 
REFERENCES public.members(id) 
ON DELETE CASCADE;

-- Part 3: Create Performance Indexes

-- Indexes for content_progress
CREATE INDEX IF NOT EXISTS idx_content_progress_member_id 
ON public.content_progress(member_id);

CREATE INDEX IF NOT EXISTS idx_content_progress_member_content 
ON public.content_progress(member_id, content_id);

CREATE INDEX IF NOT EXISTS idx_content_progress_completed 
ON public.content_progress(completed) 
WHERE completed = true;

-- Indexes for exam_attempts
CREATE INDEX IF NOT EXISTS idx_exam_attempts_member_id 
ON public.exam_attempts(member_id);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_member_exam 
ON public.exam_attempts(member_id, exam_id);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_submitted 
ON public.exam_attempts(submitted_at) 
WHERE submitted_at IS NOT NULL;

-- Indexes for enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_member_id 
ON public.enrollments(member_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_member_course 
ON public.enrollments(member_id, course_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_status 
ON public.enrollments(status);

-- Part 4: Update the RPC function to use enrollments.member_id
CREATE OR REPLACE FUNCTION calculate_course_progress(
    p_member_id INT,
    p_course_id INT
) RETURNS INTEGER AS $$
DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    progress_pct INTEGER;
BEGIN
    WITH course_exams AS (
        SELECT COUNT(DISTINCT id) as exam_count FROM exams WHERE course_id = p_course_id
    ),
    course_chapters AS (
        SELECT COUNT(DISTINCT id) as chapter_count FROM chapters WHERE course_id = p_course_id
    )
    SELECT COALESCE(exam_count, 0) + COALESCE(chapter_count, 0)
    INTO total_items FROM course_exams, course_chapters;
    
    SELECT COUNT(*) INTO completed_items
    FROM content_progress
    WHERE member_id = p_member_id AND course_id = p_course_id AND completed = true;
    
    progress_pct := CASE WHEN total_items = 0 THEN 0 ELSE ROUND((completed_items::DECIMAL / total_items) * 100) END;
    
    -- Updated to use member_id
    UPDATE enrollments SET progress = progress_pct,
        status = CASE WHEN progress_pct = 100 THEN 'completed' WHEN progress_pct > 0 THEN 'active' ELSE status END,
        updated_at = NOW()
    WHERE member_id = p_member_id AND course_id = p_course_id;
    
    RETURN progress_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_course_progress(INT, INT) TO authenticated;

-- Part 5: Verification queries (optional - comment out if not needed)
-- SELECT COUNT(*) FROM content_progress WHERE member_id IS NULL;
-- SELECT COUNT(*) FROM exam_attempts WHERE member_id IS NULL;
-- SELECT COUNT(*) FROM enrollments WHERE member_id IS NULL;
