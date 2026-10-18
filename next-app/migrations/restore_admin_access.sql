-- Restore Admin Full Access for tables where RLS was enabled
-- Pattern follows 'courses' table: Authenticated users with institute_id=10 get ALL access

-- 1. Chapters
DROP POLICY IF EXISTS "Admin Full Access" ON public.chapters;
CREATE POLICY "Admin Full Access" ON public.chapters
FOR ALL TO authenticated
USING (institute_id = 10)
WITH CHECK (institute_id = 10);

-- 2. Chapter Contents
DROP POLICY IF EXISTS "Admin Full Access" ON public.chapter_contents;
CREATE POLICY "Admin Full Access" ON public.chapter_contents
FOR ALL TO authenticated
USING (institute_id = 10)
WITH CHECK (institute_id = 10);

-- 3. Exams
DROP POLICY IF EXISTS "Admin Full Access" ON public.exams;
CREATE POLICY "Admin Full Access" ON public.exams
FOR ALL TO authenticated
USING (institute_id = 10)
WITH CHECK (institute_id = 10);

-- 4. Course Exams (Junction table)
ALTER TABLE public.course_exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access" ON public.course_exams;
CREATE POLICY "Admin Full Access" ON public.course_exams
FOR ALL TO authenticated
USING (institute_id = 10)
WITH CHECK (institute_id = 10);

-- 5. Exam Questions
DROP POLICY IF EXISTS "Admin Full Access" ON public.exam_questions;
CREATE POLICY "Admin Full Access" ON public.exam_questions
FOR ALL TO authenticated
USING (institute_id = 10)
WITH CHECK (institute_id = 10);

-- 6. Exam Sections
DROP POLICY IF EXISTS "Admin Full Access" ON public.exam_sections;
CREATE POLICY "Admin Full Access" ON public.exam_sections
FOR ALL TO authenticated
USING (institute_id = 10)
WITH CHECK (institute_id = 10);
