-- 1. Enable RLS on exam_answers
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can view their own answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Students can insert their own answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Admins can view all exam answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Admins can manage exam answers" ON public.exam_answers;

-- 3. Policy: Students can INSERT their own answers
-- (Verifies the attempt belongs to them via member_id)
CREATE POLICY "Students can insert their own answers" ON public.exam_answers
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.exam_attempts
        JOIN public.members ON members.id = exam_attempts.member_id
        WHERE exam_attempts.id = exam_answers.attempt_id
        AND members.auth_user_id = auth.uid()
    )
);

-- 4. Policy: Students can SELECT their own answers
-- (This is what fixed the Review Screen)
CREATE POLICY "Students can view their own answers" ON public.exam_answers
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.exam_attempts
        JOIN public.members ON members.id = exam_attempts.member_id
        WHERE exam_attempts.id = exam_answers.attempt_id
        AND members.auth_user_id = auth.uid()
    )
);

-- 5. Policy: Admins can view and manage everything
CREATE POLICY "Admins can manage exam answers" ON public.exam_answers
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.members
        WHERE members.auth_user_id = auth.uid()
        AND members.role = 'admin'
    )
);