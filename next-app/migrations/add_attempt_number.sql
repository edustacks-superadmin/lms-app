-- Add attempt_number to exam_attempts
ALTER TABLE public.exam_attempts
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;
