-- Allow INSERT to exam_attempts if the exam is in a public course
-- Supports both direct link (exams.course_id) and junction table (course_exams)

DROP POLICY IF EXISTS "Public Exam Attempts Insert" ON public.exam_attempts;
CREATE POLICY "Public Exam Attempts Insert" ON public.exam_attempts
FOR INSERT WITH CHECK (
    -- 1. User must be a valid member
    member_id IN (
        SELECT id FROM public.members WHERE auth_user_id = auth.uid()
    )
    AND
    (
        -- 2a. Direct Link: Exam belongs to a public course
        EXISTS (
            SELECT 1 FROM public.exams
            JOIN public.courses ON courses.id = exams.course_id
            WHERE exams.id = exam_attempts.exam_id
            AND courses.is_public = true
        )
        OR
        -- 2b. Junction Link: Exam is linked to a public course via course_exams
        EXISTS (
            SELECT 1 FROM public.course_exams
            JOIN public.courses ON courses.id = course_exams.course_id
            WHERE course_exams.exam_id = exam_attempts.exam_id
            AND courses.is_public = true
        )
    )
);

-- Allow SELECT (Read own attempts)
DROP POLICY IF EXISTS "Public Exam Attempts Select" ON public.exam_attempts;
CREATE POLICY "Public Exam Attempts Select" ON public.exam_attempts
FOR SELECT USING (
    member_id IN (
        SELECT id FROM public.members WHERE auth_user_id = auth.uid()
    )
);

-- Allow UPDATE (Update own attempts - e.g. status change)
DROP POLICY IF EXISTS "Public Exam Attempts Update" ON public.exam_attempts;
CREATE POLICY "Public Exam Attempts Update" ON public.exam_attempts
FOR UPDATE USING (
    member_id IN (
        SELECT id FROM public.members WHERE auth_user_id = auth.uid()
    )
);

-- Also need to ensure course_exams is readable
ALTER TABLE public.course_exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Course Exams Junction" ON public.course_exams;
CREATE POLICY "Public Course Exams Junction" ON public.course_exams
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = course_exams.course_id
        AND courses.is_public = true
    )
);
