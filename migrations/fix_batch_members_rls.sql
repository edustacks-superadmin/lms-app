-- =========================================================================
-- Fix Row Level Security (RLS) for batch_members table
-- =========================================================================

-- 1. Ensure RLS is enabled on batch_members
ALTER TABLE IF EXISTS public.batch_members ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies on batch_members
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.batch_members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.batch_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.batch_members;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.batch_members;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.batch_members;
DROP POLICY IF EXISTS "Allow public read access" ON public.batch_members;

-- 3. Policy: Allow authenticated users (Admins & Staff) full access
CREATE POLICY "Allow all for authenticated users"
ON public.batch_members FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Policy: Allow public read access to verify membership counts
CREATE POLICY "Allow public read access"
ON public.batch_members FOR SELECT
TO public
USING (true);

SELECT 'RLS policies for batch_members updated successfully!' as message;
