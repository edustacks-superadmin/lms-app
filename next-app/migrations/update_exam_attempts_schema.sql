-- Add missing columns to exam_attempts to support frontend features
ALTER TABLE public.exam_attempts
ADD COLUMN IF NOT EXISTS tab_switches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_auto_submitted BOOLEAN DEFAULT false;

-- Allow started_at to be nullable if it isn't already, just in case code doesn't send it
ALTER TABLE public.exam_attempts
ALTER COLUMN started_at DROP NOT NULL;
