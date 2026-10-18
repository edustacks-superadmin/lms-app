
-- Enable RLS on post_batches
ALTER TABLE post_batches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON post_batches;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON post_batches;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON post_batches;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON post_batches;

-- Create policies
-- Allow everyone to read post batches (needed for public posts)
CREATE POLICY "Enable read access for all users" ON post_batches
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update/delete (for creating/editing posts)
CREATE POLICY "Enable all access for authenticated users" ON post_batches
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
