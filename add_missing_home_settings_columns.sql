-- Add missing columns to home_settings table
ALTER TABLE public.home_settings 
ADD COLUMN IF NOT EXISTS institute_logo_url TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Comment on columns
COMMENT ON COLUMN public.home_settings.institute_logo_url IS 'URL of the institute logo';
COMMENT ON COLUMN public.home_settings.tagline IS 'Institute tagline or slogan';
