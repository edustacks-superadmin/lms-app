-- Enable RLS (just in case)
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it conflicts (optional, but safer to just create new with unique name)
DROP POLICY IF EXISTS "Allow user access to own bookmarks" ON public.bookmarks;

-- Create Policy
CREATE POLICY "Allow user access to own bookmarks"
ON public.bookmarks
FOR ALL
TO authenticated
USING (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);
