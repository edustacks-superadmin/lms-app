-- Add SEO fields to institute_settings table
ALTER TABLE institute_settings
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS meta_robots_follow TEXT DEFAULT 'Follow',
ADD COLUMN IF NOT EXISTS meta_robots_index TEXT DEFAULT 'Index';

-- Comment on columns
COMMENT ON COLUMN institute_settings.seo_title IS 'Global SEO Title for the application';
COMMENT ON COLUMN institute_settings.meta_description IS 'Global Meta Description';
COMMENT ON COLUMN institute_settings.keywords IS 'Global Meta Keywords';
COMMENT ON COLUMN institute_settings.meta_robots_follow IS 'Robots Follow directive (Follow/Nofollow)';
COMMENT ON COLUMN institute_settings.meta_robots_index IS 'Robots Index directive (Index/Noindex)';
