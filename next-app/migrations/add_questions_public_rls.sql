-- Enable RLS on core question tables
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

-- 1. Public Access for Questions
DROP POLICY IF EXISTS "Public Questions Select" ON public.questions;
CREATE POLICY "Public Questions Select" ON public.questions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.exam_questions
        JOIN public.exams ON exams.id = exam_questions.exam_id
        JOIN public.courses ON courses.id = exams.course_id
        WHERE exam_questions.question_id = questions.id
        AND courses.is_public = true
    )
);

-- 2. Public Access for Question Options
DROP POLICY IF EXISTS "Public Question Options Select" ON public.question_options;
CREATE POLICY "Public Question Options Select" ON public.question_options
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.exam_questions
        JOIN public.exams ON exams.id = exam_questions.exam_id
        JOIN public.courses ON courses.id = exams.course_id
        WHERE exam_questions.question_id = question_options.question_id
        AND courses.is_public = true
    )
);

-- 3. Also allow access if the question is linked to ANY exam that is linked to a public course via junction
DROP POLICY IF EXISTS "Public Questions Junction Select" ON public.questions;
CREATE POLICY "Public Questions Junction Select" ON public.questions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.exam_questions
        JOIN public.course_exams ON course_exams.exam_id = exam_questions.exam_id
        JOIN public.courses ON courses.id = course_exams.course_id
        WHERE exam_questions.question_id = questions.id
        AND courses.is_public = true
    )
);

DROP POLICY IF EXISTS "Public Question Options Junction Select" ON public.question_options;
CREATE POLICY "Public Question Options Junction Select" ON public.question_options
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.exam_questions
        JOIN public.course_exams ON course_exams.exam_id = exam_questions.exam_id
        JOIN public.courses ON courses.id = course_exams.course_id
        WHERE exam_questions.question_id = question_options.question_id
        AND courses.is_public = true
    )
);
