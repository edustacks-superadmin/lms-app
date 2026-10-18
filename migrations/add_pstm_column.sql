-- Add pstm_status column to external_exam_results table if it doesn't exist
ALTER TABLE public.external_exam_results 
ADD COLUMN IF NOT EXISTS pstm_status BOOLEAN DEFAULT FALSE;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
