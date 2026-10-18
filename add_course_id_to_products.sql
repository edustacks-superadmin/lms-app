-- Add course_id column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_products_course_id ON public.products(course_id);

-- Attempt to link existing products to courses by title matching (Case insensitive)
-- This is a best-effort migration for existing data
UPDATE public.products p
SET course_id = c.id
FROM public.courses c
WHERE p.course_id IS NULL 
AND (
    p.title ILIKE c.title 
    OR c.title ILIKE p.title
    OR p.title ILIKE '%' || c.title || '%'
    OR c.title ILIKE '%' || p.title || '%'
);
