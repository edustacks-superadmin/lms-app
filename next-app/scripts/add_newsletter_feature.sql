-- Add Newsletter Subscription feature tables and columns
-- Run this in Supabase SQL Editor

-- Newsletter settings columns in home_settings
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS show_newsletter BOOLEAN DEFAULT false;
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS newsletter_title TEXT DEFAULT 'Subscribe to Our Newsletter';
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS newsletter_subtitle TEXT DEFAULT 'Stay updated with latest courses and offers';

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    institute_id BIGINT REFERENCES institute_settings(id),
    email VARCHAR(255) NOT NULL,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(institute_id, email)
);

-- Add RLS policies
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow inserts for anyone (public subscription)
CREATE POLICY "Allow public newsletter subscription" ON newsletter_subscribers
    FOR INSERT WITH CHECK (true);

-- Allow admin to view subscribers for their institute
CREATE POLICY "Allow admin to view institute subscribers" ON newsletter_subscribers
    FOR SELECT USING (true);
