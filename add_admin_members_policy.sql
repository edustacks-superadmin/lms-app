-- Add RLS policy to allow admins to view all members

CREATE POLICY "Admins can view all members"
ON public.members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.members AS m
        WHERE m.email = auth.jwt() ->> 'email'
        AND m.role = 'admin'
    )
);
