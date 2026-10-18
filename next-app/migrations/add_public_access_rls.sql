-- Enable RLS on core content tables (Safe to run if already enabled)
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- 1. Public Access for Chapters
DROP POLICY IF EXISTS "Public Course Chapters" ON public.chapters;
CREATE POLICY "Public Course Chapters" ON public.chapters
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = chapters.course_id
        AND courses.is_public = true
    )
);

-- 2. Public Access for Chapter Contents
DROP POLICY IF EXISTS "Public Course Content" ON public.chapter_contents;
CREATE POLICY "Public Course Content" ON public.chapter_contents
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.chapters
        JOIN public.courses ON courses.id = chapters.course_id
        WHERE chapters.id = chapter_contents.chapter_id
        AND courses.is_public = true
    )
);

-- 3. Public Access for Exams
DROP POLICY IF EXISTS "Public Course Exams" ON public.exams;
CREATE POLICY "Public Course Exams" ON public.exams
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = exams.course_id
        AND courses.is_public = true
    )
);

-- 4. Public Access for Exam Questions
DROP POLICY IF EXISTS "Public Exam Questions" ON public.exam_questions;
CREATE POLICY "Public Exam Questions" ON public.exam_questions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.exams
        JOIN public.courses ON courses.id = exams.course_id
        WHERE exams.id = exam_questions.exam_id
        AND courses.is_public = true
    )
);

-- 5. Public Access for Exam Sections
DROP POLICY IF EXISTS "Public Exam Sections" ON public.exam_sections;
CREATE POLICY "Public Exam Sections" ON public.exam_sections
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.exams
        JOIN public.courses ON courses.id = exams.course_id
        WHERE exams.id = exam_sections.exam_id
        AND courses.is_public = true
    )
);

-- 6. Public Access for Exam Attempts (Allow INSERT/UPDATE)
-- Corrected to use member_id resolution from auth.uid()

DROP POLICY IF EXISTS "Public Exam Attempts Insert" ON public.exam_attempts;
CREATE POLICY "Public Exam Attempts Insert" ON public.exam_attempts
FOR INSERT WITH CHECK (
    member_id IN (
        SELECT id FROM public.members WHERE auth_user_id = auth.uid()
    )
    AND
    EXISTS (
        SELECT 1 FROM public.exams
        JOIN public.courses ON courses.id = exams.course_id
        WHERE exams.id = exam_attempts.exam_id
        AND courses.is_public = true
    )
);

DROP POLICY IF EXISTS "Public Exam Attempts Select" ON public.exam_attempts;
CREATE POLICY "Public Exam Attempts Select" ON public.exam_attempts
FOR SELECT USING (
    member_id IN (
        SELECT id FROM public.members WHERE auth_user_id = auth.uid()
    )
    AND
    EXISTS (
        SELECT 1 FROM public.exams
        JOIN public.courses ON courses.id = exams.course_id
        WHERE exams.id = exam_attempts.exam_id
        AND courses.is_public = true
    )
);

DROP POLICY IF EXISTS "Public Exam Attempts Update" ON public.exam_attempts;
CREATE POLICY "Public Exam Attempts Update" ON public.exam_attempts
FOR UPDATE USING (
    member_id IN (
        SELECT id FROM public.members WHERE auth_user_id = auth.uid()
    )
    AND
    EXISTS (
        SELECT 1 FROM public.exams
        JOIN public.courses ON courses.id = exams.course_id
        WHERE exams.id = exam_attempts.exam_id
        AND courses.is_public = true
    )
);
