-- Add slug column to posts table
ALTER TABLE public.posts 
ADD COLUMN slug text UNIQUE;

-- Create an index for faster lookups
CREATE INDEX idx_posts_slug ON public.posts(slug);
