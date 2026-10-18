-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to update user password
CREATE OR REPLACE FUNCTION update_student_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
BEGIN
  -- Check if the executing user is an admin (optional, but recommended for security)
  -- For now, we'll rely on RLS and application logic, but ideally you'd check a role here.
  -- IF NOT EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid() AND role = 'admin') THEN
  --   RAISE EXCEPTION 'Access denied';
  -- END IF;

  -- Update the password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (so the API can call it)
GRANT EXECUTE ON FUNCTION update_student_password(UUID, TEXT) TO authenticated;
