-- Allow authenticated users to insert into home_settings
-- This is needed when the table is empty and we need to create the initial row

CREATE POLICY "Allow authenticated users to insert home_settings"
ON public.home_settings FOR INSERT
TO authenticated
WITH CHECK (true);
