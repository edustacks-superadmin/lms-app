-- Create banner_ads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.banner_ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    link_url TEXT,
    image_url TEXT NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.banner_ads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid errors
DROP POLICY IF EXISTS "Enable read access for all users" ON public.banner_ads;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.banner_ads;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.banner_ads;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.banner_ads;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.banner_ads
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.banner_ads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.banner_ads
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.banner_ads
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create storage bucket for banner ads
INSERT INTO storage.buckets (id, name, public)
VALUES ('banner-ads', 'banner-ads', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Give public access to banner images" ON storage.objects;
DROP POLICY IF EXISTS "Enable upload for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON storage.objects;

-- Storage policies
CREATE POLICY "Give public access to banner images" ON storage.objects
    FOR SELECT USING (bucket_id = 'banner-ads');

CREATE POLICY "Enable upload for authenticated users" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'banner-ads' AND auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON storage.objects
    FOR UPDATE USING (bucket_id = 'banner-ads' AND auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON storage.objects
    FOR DELETE USING (bucket_id = 'banner-ads' AND auth.role() = 'authenticated');
