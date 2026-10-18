-- Add is_public column to courses table
-- Default is false (private) to maintain existing behavior

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add index for performance on public queries
CREATE INDEX IF NOT EXISTS idx_courses_is_public ON public.courses(is_public);
