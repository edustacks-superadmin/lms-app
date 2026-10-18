-- Clean up ALL potential policy names used in previous attempts
DROP POLICY IF EXISTS "Auth Question Options Select" ON public.question_options;
DROP POLICY IF EXISTS "Auth Questions Select" ON public.questions;
DROP POLICY IF EXISTS "Anon Question Options Select" ON public.question_options;
DROP POLICY IF EXISTS "Anon Questions Select" ON public.questions;
DROP POLICY IF EXISTS "Anon Question Options Junction Select" ON public.question_options;
DROP POLICY IF EXISTS "Anon Questions Junction Select" ON public.questions;
DROP POLICY IF EXISTS "Authenticated Question Options Select" ON public.question_options;
DROP POLICY IF EXISTS "Authenticated Questions Select" ON public.questions;
DROP POLICY IF EXISTS "Public Question Options Select" ON public.question_options;
DROP POLICY IF EXISTS "Public Questions Select" ON public.questions;
DROP POLICY IF EXISTS "Public Question Options Junction Select" ON public.question_options;
DROP POLICY IF EXISTS "Public Questions Junction Select" ON public.questions;

-- 1. Authenticated Access (Students/Admins)
CREATE POLICY "Auth Question Options Select" ON public.question_options
FOR SELECT TO authenticated
USING (institute_id = 10);

CREATE POLICY "Auth Questions Select" ON public.questions
FOR SELECT TO authenticated
USING (institute_id = 10);

-- 2. Anon Access (Public courses / Guests)
CREATE POLICY "Anon Question Options Select" ON public.question_options
FOR SELECT TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.exam_questions
        JOIN public.exams ON exams.id = exam_questions.exam_id
        JOIN public.courses ON courses.id = exams.course_id
        WHERE exam_questions.question_id = question_options.question_id
        AND courses.is_public = true
    )
);

CREATE POLICY "Anon Questions Select" ON public.questions
FOR SELECT TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.exam_questions
        JOIN public.exams ON exams.id = exam_questions.exam_id
        JOIN public.courses ON courses.id = exams.course_id
        WHERE exam_questions.question_id = questions.id
        AND courses.is_public = true
    )
);

-- 3. Junction Access (Anon)
CREATE POLICY "Anon Question Options Junction Select" ON public.question_options
FOR SELECT TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.exam_questions
        JOIN public.course_exams ON course_exams.exam_id = exam_questions.exam_id
        JOIN public.courses ON courses.id = course_exams.course_id
        WHERE exam_questions.question_id = question_options.question_id
        AND courses.is_public = true
    )
);

CREATE POLICY "Anon Questions Junction Select" ON public.questions
FOR SELECT TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.exam_questions
        JOIN public.course_exams ON course_exams.exam_id = exam_questions.exam_id
        JOIN public.courses ON courses.id = course_exams.course_id
        WHERE exam_questions.question_id = questions.id
        AND courses.is_public = true
    )
);
