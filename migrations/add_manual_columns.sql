-- Add missing columns to external_exam_results table if they don't exist

-- 1. Add is_manual_entry column
ALTER TABLE public.external_exam_results 
ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT FALSE;

-- 2. Add dob column
ALTER TABLE public.external_exam_results 
ADD COLUMN IF NOT EXISTS dob DATE;

-- 3. Refresh schema cache (PostgREST requires this sometimes, though ALTER usually triggers it)
NOTIFY pgrst, 'reload config';
