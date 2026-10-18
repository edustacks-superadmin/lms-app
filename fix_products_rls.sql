-- Enable RLS on products table and add policy to allow authenticated users to read
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON products;

-- Create policy to allow all authenticated users to view products
CREATE POLICY "Allow authenticated users to read products"
ON products FOR SELECT
TO authenticated
USING (true);

-- Also allow public (anon) users to read products for the store
DROP POLICY IF EXISTS "Allow public to read products" ON products;

CREATE POLICY "Allow public to read products"
ON products FOR SELECT
TO anon
USING (true);
