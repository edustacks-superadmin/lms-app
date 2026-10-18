-- Add Communication & Engagement (Module E) columns to institute_settings table

ALTER TABLE public.institute_settings
ADD COLUMN IF NOT EXISTS enable_comments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS comment_moderation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_admin_on_comment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS blocked_comment_words TEXT;

-- Comments
COMMENT ON COLUMN public.institute_settings.enable_comments IS 'Global master switch to enable/disable comments platform-wide';
COMMENT ON COLUMN public.institute_settings.comment_moderation IS 'If true, comments must be approved by admin before being visible';
COMMENT ON COLUMN public.institute_settings.notify_admin_on_comment IS 'Send email notification to admin for every new comment';
