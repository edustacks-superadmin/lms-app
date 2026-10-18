-- FIX Members auth_user_id Type Mismatch
-- The column 'auth_user_id' in 'members' table was incorrectly converted to INTEGER.
-- This script reverts it to UUID and restores the link to auth.users.

-- 1. Remove Debug Data (optional, cleanup)
DELETE FROM public.members WHERE username LIKE 'debug_%';

-- 2. Alter column to UUID
-- We use USING NULL because existing integers (if any) cannot be cast to UUID.
-- This effectively temporarily unlinks all users, but we will restore them in step 3.
ALTER TABLE public.members 
ALTER COLUMN auth_user_id TYPE uuid USING NULL;

-- 3. Restore Auth Links
-- Match public.members with auth.users via Email and update auth_user_id
UPDATE public.members m
SET auth_user_id = au.id
FROM auth.users au
WHERE m.email = au.email;

-- 4. Verify Constraints (Optional but good)
-- Ensure unique constraint exists if it was dropped
-- ALTER TABLE public.members ADD CONSTRAINT members_auth_user_id_key UNIQUE (auth_user_id);
