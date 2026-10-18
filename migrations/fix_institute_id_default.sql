-- Fix: Update default institute_id for members table to 10
-- Currently it seems to be defaulting to 12 incorrectly

ALTER TABLE public.members ALTER COLUMN institute_id SET DEFAULT 10;

-- Optional: Update any members that might have been created with 12 erroneously (if desired, but user didn't ask for data cleanup, just fix for signup)
-- UPDATE public.members SET institute_id = 10 WHERE institute_id = 12 AND created_at > NOW() - INTERVAL '1 day'; 
