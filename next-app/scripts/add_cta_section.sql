-- Add CTA Section settings
-- Run this in Supabase SQL Editor

ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS show_cta_section BOOLEAN DEFAULT false;
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS cta_title TEXT;
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS cta_subtitle TEXT;
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS cta_button_text TEXT DEFAULT 'Get Started Now';
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS cta_button_link TEXT DEFAULT '/store';
