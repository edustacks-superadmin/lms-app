-- Add Student Data & Profile (Module C) columns to institute_settings table

ALTER TABLE public.institute_settings
ADD COLUMN IF NOT EXISTS enforce_user_photo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_user_profile_edit BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS disable_forgot_password BOOLEAN DEFAULT false;

-- Comments
COMMENT ON COLUMN public.institute_settings.enforce_user_photo IS 'If true, users are forced to upload a profile photo';
COMMENT ON COLUMN public.institute_settings.allow_user_profile_edit IS 'If false, users cannot edit their name or email after signup';
COMMENT ON COLUMN public.institute_settings.disable_forgot_password IS 'If true, the Forgot Password option is hidden';
