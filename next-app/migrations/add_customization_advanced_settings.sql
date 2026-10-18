-- Add White-Labeling (Module D) and Advanced Settings (Module F) columns

ALTER TABLE public.institute_settings
-- Module D: White-Labeling
ADD COLUMN IF NOT EXISTS label_dashboard VARCHAR(50) DEFAULT 'Dashboard',
ADD COLUMN IF NOT EXISTS label_leaderboard VARCHAR(50) DEFAULT 'Leaderboard',
ADD COLUMN IF NOT EXISTS label_helpdesk VARCHAR(50) DEFAULT 'Support',
ADD COLUMN IF NOT EXISTS label_bookmarks VARCHAR(50) DEFAULT 'Bookmarks',
ADD COLUMN IF NOT EXISTS label_username VARCHAR(50) DEFAULT 'Email / Phone',
ADD COLUMN IF NOT EXISTS label_password VARCHAR(50) DEFAULT 'Password',
ADD COLUMN IF NOT EXISTS msg_empty_course TEXT,
ADD COLUMN IF NOT EXISTS custom_header_html TEXT,

-- Module F: Advanced Features
ADD COLUMN IF NOT EXISTS webhook_order_success TEXT,
ADD COLUMN IF NOT EXISTS webhook_exam_result TEXT,
ADD COLUMN IF NOT EXISTS android_app_hash_key VARCHAR(100),
ADD COLUMN IF NOT EXISTS disable_student_analytics BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_leaderboard_names BOOLEAN DEFAULT false;

-- Comments
COMMENT ON COLUMN public.institute_settings.custom_header_html IS 'Custom HTML/Scripts injected into the head/header of the student portal';
COMMENT ON COLUMN public.institute_settings.android_app_hash_key IS 'Hash key for Android SMS auto-verification';
