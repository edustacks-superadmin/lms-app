-- Add Registration and Onboarding settings columns to institute_settings table

ALTER TABLE public.institute_settings
ADD COLUMN IF NOT EXISTS allow_student_registration BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50) DEFAULT 'email', -- 'email', 'sms', 'manual', 'none'
ADD COLUMN IF NOT EXISTS allow_google_login BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_facebook_login BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS login_access_code VARCHAR(50); -- Optional code required for signup

-- Add comments for clarity
COMMENT ON COLUMN public.institute_settings.allow_student_registration IS 'Master switch to allow or block new student signups';
COMMENT ON COLUMN public.institute_settings.verification_method IS 'Method used to verify new accounts (email, sms, manual admin approval, or none)';
COMMENT ON COLUMN public.institute_settings.login_access_code IS 'If set, students must enter this code to register (e.g. for private cohorts)';
