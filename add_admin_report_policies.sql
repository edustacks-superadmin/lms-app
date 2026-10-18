-- Add RLS policies to allow admins to manage question reports

-- Policy for SELECT (View all reports)
CREATE POLICY "Admins can view all reports"
ON public.question_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.members
        WHERE members.email = auth.jwt() ->> 'email'
        AND members.role = 'admin'
    )
);

-- Policy for UPDATE (Resolve/Reject reports)
CREATE POLICY "Admins can update reports"
ON public.question_reports FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.members
        WHERE members.email = auth.jwt() ->> 'email'
        AND members.role = 'admin'
    )
);

-- Policy for DELETE (Delete reports)
CREATE POLICY "Admins can delete reports"
ON public.question_reports FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.members
        WHERE members.email = auth.jwt() ->> 'email'
        AND members.role = 'admin'
    )
);
