-- Add video_url and is_featured columns to testimonials table
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create an index for featured testimonials to optimize fetching
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials (institute_id, is_featured) WHERE is_featured = true;
