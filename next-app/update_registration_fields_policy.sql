-- Allow authenticated users (admins) to UPDATE fields
CREATE POLICY "Allow authenticated update"
ON public.registration_fields
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users (admins) to INSERT fields
CREATE POLICY "Allow authenticated insert"
ON public.registration_fields
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users (admins) to DELETE fields
CREATE POLICY "Allow authenticated delete"
ON public.registration_fields
FOR DELETE
TO authenticated
USING (true);
