-- Add new columns for Live Stats and Announcement Bar features
-- Run this in Supabase SQL Editor

-- Live Stats columns
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS show_live_stats BOOLEAN DEFAULT false;
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS live_stats_config JSONB DEFAULT '{"stats": []}';

-- Announcement Bar columns
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS announcement_bar_enabled BOOLEAN DEFAULT false;
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS announcement_bar_text TEXT;
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS announcement_bar_link TEXT;
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS announcement_bar_bg_color VARCHAR(20) DEFAULT '#3b82f6';
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS announcement_bar_text_color VARCHAR(20) DEFAULT '#ffffff';
