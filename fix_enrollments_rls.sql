-- Enable RLS on enrollments if not already enabled
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users (like admins) to insert enrollments
-- This is necessary because the default policy usually only allows users to insert their OWN enrollments
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.enrollments;

CREATE POLICY "Enable insert for authenticated users" ON public.enrollments
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Also ensure they can view them to check for duplicates
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.enrollments;

CREATE POLICY "Enable select for authenticated users" ON public.enrollments
FOR SELECT
USING (auth.role() = 'authenticated');
