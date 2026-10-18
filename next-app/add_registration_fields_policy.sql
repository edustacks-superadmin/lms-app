-- Enable RLS on the table (ensure it is enabled)
ALTER TABLE public.registration_fields ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (needed for registration form)
CREATE POLICY "Allow public read access"
ON public.registration_fields
FOR SELECT
TO public
USING (true);

-- Create policy to allow admins to insert/update/delete (optional, if not already existing)
-- Assuming auth.uid() check or role check for admin
-- CREATE POLICY "Allow admin full access"
-- ON public.registration_fields
-- FOR ALL
-- TO authenticated
-- USING ( ... );
