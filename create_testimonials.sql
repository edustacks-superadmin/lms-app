-- Create testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    message TEXT NOT NULL,
    image_url TEXT,
    rating INTEGER DEFAULT 5,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access" ON testimonials FOR SELECT USING (true);
CREATE POLICY "Admin full access" ON testimonials FOR ALL USING (auth.role() = 'authenticated'); -- Simplified for now, ideally check for admin role

-- Storage bucket for testimonial images
INSERT INTO storage.buckets (id, name, public) VALUES ('testimonials', 'testimonials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'testimonials');
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'testimonials' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'testimonials' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'testimonials' AND auth.role() = 'authenticated');
