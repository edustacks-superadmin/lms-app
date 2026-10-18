-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    text TEXT NOT NULL,
    author TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS "Allow public read access" ON quotes;
DROP POLICY IF EXISTS "Allow authenticated insert" ON quotes;
DROP POLICY IF EXISTS "Allow authenticated update" ON quotes;
DROP POLICY IF EXISTS "Allow authenticated delete" ON quotes;

-- Create policies
-- Allow public read access (so students can see quotes)
CREATE POLICY "Allow public read access" ON quotes
    FOR SELECT USING (true);

-- Allow authenticated users (admins) to insert, update, delete
CREATE POLICY "Allow authenticated insert" ON quotes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON quotes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON quotes
    FOR DELETE USING (auth.role() = 'authenticated');

-- Insert some initial sample quotes
INSERT INTO quotes (text, author, status) VALUES
('The beautiful thing about learning is that no one can take it away from you.', 'B.B. King', 'Active'),
('Education is the passport to the future, for tomorrow belongs to those who prepare for it today.', 'Malcolm X', 'Active'),
('Live as if you were to die tomorrow. Learn as if you were to live forever.', 'Mahatma Gandhi', 'Active');
