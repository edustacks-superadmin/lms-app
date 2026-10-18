-- Allow users to update their own member data
-- This policy ensures that a user can only update rows where the email matches their authenticated email.

CREATE POLICY "Users can update their own member data"
ON members FOR UPDATE
TO authenticated
USING (email = auth.jwt() ->> 'email')
WITH CHECK (email = auth.jwt() ->> 'email');
