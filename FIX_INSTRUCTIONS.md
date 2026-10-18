# CRITICAL FIX INSTRUCTIONS (UPDATED)

It seems the previous fix might have missed some roles (like staff or mentor) or had issues with email matching.
This updated script is more robust.

**You MUST run this updated script in your Supabase Dashboard.**

1.  **Copy the SQL Code below:**

```sql
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
```

2.  **Go to your Supabase Dashboard:**
    *   Open your browser and go to your Supabase project dashboard.
    *   Go to the **SQL Editor**.

3.  **Run the Script:**
    *   Click "New Query".
    *   Paste the code you copied.
    *   Click **Run**.

4.  **Verify:**
    *   Go back to your app and refresh the Reported Questions page.
    *   The "Unknown User" should now show the correct names.
