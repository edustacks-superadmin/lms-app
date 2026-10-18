-- Add Mobile Bottom Nav setting
-- Run this in Supabase SQL Editor

ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS mobile_bottom_nav_enabled BOOLEAN DEFAULT true;
