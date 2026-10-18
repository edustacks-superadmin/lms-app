-- Create/Update trigger for new user signup with Testpress-compatible structure

-- 1. Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.members (
    auth_user_id,
    email,
    username,
    first_name,
    last_name,
    display_name,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,  -- UUID from auth.users
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1),  -- Generate username from email
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    -- Auto-generate display_name from first_name + last_name
    TRIM(CONCAT(
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      ' ',
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),  -- Default to student
    'active',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 3. Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
SELECT 'Auth trigger created successfully!' as message;
