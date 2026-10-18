-- Create home_settings table for customizable home page content
CREATE TABLE IF NOT EXISTS home_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Header Settings
  institute_name TEXT DEFAULT 'Mahesh IES Academy',
  institute_logo_url TEXT,
  tagline TEXT,
  signup_link_text TEXT DEFAULT 'Sign Up',
  
  -- Hero Banner Settings
  hero_banner_image TEXT,
  hero_title TEXT DEFAULT 'Welcome to Mahesh IES Academy',
  hero_subtitle TEXT DEFAULT 'Empowering Students, One Course at a Time',
  hero_cta_text TEXT DEFAULT 'Explore Courses',
  hero_cta_link TEXT DEFAULT '#products',
  
  -- Footer About Column
  about_text TEXT DEFAULT 'Mahesh IES Academy is dedicated to providing quality education and training to help students achieve their goals.',
  mission_text TEXT DEFAULT 'Our mission is to empower students with knowledge and skills for a successful future.',
  
  -- Footer Contact Column
  contact_address TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  
  -- Social Media Links
  facebook_url TEXT,
  instagram_url TEXT,
  linkedin_url TEXT,
  youtube_url TEXT,
  
  -- Footer Bottom
  copyright_text TEXT DEFAULT '© 2025 Mahesh IES Academy. All rights reserved.',
  privacy_policy_link TEXT,
  terms_link TEXT,
  
  -- Product Display Settings
  show_products BOOLEAN DEFAULT TRUE,
  products_to_display INTEGER DEFAULT 6,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row (singleton pattern - only one row should exist)
INSERT INTO home_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies
ALTER TABLE home_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for home page)
CREATE POLICY "Allow public read access to home_settings"
ON home_settings FOR SELECT
TO public
USING (true);

-- Allow authenticated users to update (admin only in practice)
CREATE POLICY "Allow authenticated users to update home_settings"
ON home_settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
