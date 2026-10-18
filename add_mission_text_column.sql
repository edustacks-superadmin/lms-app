-- Add mission_text column to institute_settings table
ALTER TABLE public.institute_settings 
ADD COLUMN IF NOT EXISTS mission_text TEXT;

-- Comment on column
COMMENT ON COLUMN public.institute_settings.mission_text IS 'Institute mission statement';
