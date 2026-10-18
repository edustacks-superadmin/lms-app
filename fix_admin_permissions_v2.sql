-- Fix infinite recursion and allow staff/mentors

-- 1. Create a secure function to check admin/staff status
-- Uses user_id for better reliability and includes 'staff' and 'mentor' roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'staff', 'mentor')
  );
END;
$$;

-- 2. Drop the recursive policy if it exists
DROP POLICY IF EXISTS "Admins can view all members" ON public.members;

-- 3. Create the new policy using the function
CREATE POLICY "Admins can view all members"
ON public.members FOR SELECT
USING (
    public.is_admin()
);
