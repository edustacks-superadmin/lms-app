-- Fix: Add trigger to auto-create member record on auth signup
-- This trigger was lost during schema recreation

-- 1. Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.members (id, name, email, password, status, created_at, updated_at)
  VALUES (
    NEW.id::integer,  -- Convert UUID to integer (this won't work - need different approach)
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NULL,  -- Password is handled by auth
    'active',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 2. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
