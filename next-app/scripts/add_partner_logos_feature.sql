-- Add Partner Logos feature
-- Run this in Supabase SQL Editor

-- Partner settings in home_settings
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS show_partner_logos BOOLEAN DEFAULT false;
ALTER TABLE home_settings ADD COLUMN IF NOT EXISTS partner_logos_title TEXT DEFAULT 'Trusted By';

-- Partner logos table
CREATE TABLE IF NOT EXISTS partner_logos (
    id SERIAL PRIMARY KEY,
    institute_id BIGINT REFERENCES institute_settings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT NOT NULL,
    website_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE partner_logos ENABLE ROW LEVEL SECURITY;

-- Allow public to view active logos
CREATE POLICY "Allow public to view active partner logos" ON partner_logos
    FOR SELECT USING (is_active = true);

-- Allow admin to manage logos
CREATE POLICY "Allow admin to manage partner logos" ON partner_logos
    FOR ALL USING (true);
