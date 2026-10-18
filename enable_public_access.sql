-- Enable Public Read Access for Institute Settings
DROP POLICY IF EXISTS "Public Read Institute Settings" ON institute_settings;
CREATE POLICY "Public Read Institute Settings" ON institute_settings
FOR SELECT USING (true); -- Allows everyone to read (for now)

-- Enable Public Read Access for Products
DROP POLICY IF EXISTS "Public Read Products" ON products;
CREATE POLICY "Public Read Products" ON products
FOR SELECT USING (true);

-- Enable Public Read Access for Courses
DROP POLICY IF EXISTS "Public Read Courses" ON courses;
CREATE POLICY "Public Read Courses" ON courses
FOR SELECT USING (true);

-- Enable Public Read Access for Banners
DROP POLICY IF EXISTS "Public Read Banner Ads" ON banner_ads;
CREATE POLICY "Public Read Banner Ads" ON banner_ads
FOR SELECT USING (true);

-- Enable Admin Full Access (If using authenticated admin)
-- Replace with proper role check later
-- CREATE POLICY "Admin Full Access" ON products USING (auth.role() = 'authenticated');
