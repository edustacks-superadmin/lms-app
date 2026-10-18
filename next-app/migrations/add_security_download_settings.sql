-- Add Security and Download settings columns to institute_settings table

ALTER TABLE public.institute_settings
ADD COLUMN IF NOT EXISTS enable_single_device_login BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allowed_ips TEXT, -- Comma separated list of IPs
ADD COLUMN IF NOT EXISTS max_login_attempts INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS login_cooldown_minutes INT DEFAULT 30,
ADD COLUMN IF NOT EXISTS session_timeout_minutes INT DEFAULT 60,
ADD COLUMN IF NOT EXISTS logout_at_browser_close BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_pdf_download BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_video_download BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_video_downloads INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS enable_pdf_watermark BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pdf_watermark_image_url TEXT,
ADD COLUMN IF NOT EXISTS enable_video_watermark BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_watermark_position VARCHAR(50) DEFAULT 'center';

-- Add comments for clarity
COMMENT ON COLUMN public.institute_settings.enable_single_device_login IS 'If true, invalidates old sessions when logging in from a new device';
COMMENT ON COLUMN public.institute_settings.max_video_downloads IS 'Maximum number of videos a user can download offline in the mobile app';
