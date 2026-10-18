-- 1. Add user_id column to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Update trigger function to include user_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (user_id, email, name, role, status, joining_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    'Active',
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    name = EXCLUDED.name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill user_id for existing members
UPDATE public.members m
SET user_id = u.id
FROM auth.users u
WHERE m.email = u.email
AND m.user_id IS NULL;

-- 4. Update RLS to allow viewing all profiles (needed for leaderboard)
DROP POLICY IF EXISTS "Members can view their own profile" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.members;

CREATE POLICY "Authenticated users can view all profiles"
ON public.members FOR SELECT
TO authenticated
USING (true);

-- 5. Update write policy to use user_id (more secure/robust than email)
DROP POLICY IF EXISTS "Members can update their own profile" ON public.members;

CREATE POLICY "Members can update their own profile"
ON public.members FOR UPDATE
USING (auth.uid() = user_id);
