-- Add RLS policy to allow public read access to product_categories
-- This allows the mobile app to fetch categories without authentication

-- Enable RLS if not already enabled
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to product categories" ON product_categories;

-- Create policy to allow anyone to read product categories
CREATE POLICY "Allow public read access to product categories"
ON product_categories
FOR SELECT
TO public
USING (true);

-- Verify the policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'product_categories';
