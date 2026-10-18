-- COMPLETELY RESET MEMBERS RLS
-- This script will drop ALL policies on the members table and recreate them correctly.

-- 1. Drop ALL existing policies on members table dynamically
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN select policyname from pg_policies where tablename = 'members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.members', pol.policyname);
    END LOOP;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- 3. Create the secure admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user has an admin-like role
  -- Runs as the database owner to bypass RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'staff', 'mentor')
  );
END;
$$;

-- 4. Recreate Policies

-- Policy A: Users can view their own data
CREATE POLICY "Users can view their own member data"
ON public.members FOR SELECT
USING (
    auth.uid() = user_id
);

-- Policy B: Admins/Staff/Mentors can view ALL members
CREATE POLICY "Admins can view all members"
ON public.members FOR SELECT
USING (
    public.is_admin()
);

-- Policy C: Service Role (Full Access)
CREATE POLICY "Service role has full access"
ON public.members FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
