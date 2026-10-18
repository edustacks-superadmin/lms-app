
-- Allow authenticated users (students) to view active offers
CREATE POLICY "Authenticated users can view active offers"
ON public.offers FOR SELECT
USING (
    auth.role() = 'authenticated' AND status = 'active'
);
