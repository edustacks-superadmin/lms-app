-- Add status_probability column to external_exam_results table
ALTER TABLE public.external_exam_results
ADD COLUMN IF NOT EXISTS status_probability text;

-- Optional: Add a check constraint to ensure valid values if needed
-- ALTER TABLE public.external_exam_results
-- ADD CONSTRAINT status_probability_check CHECK (status_probability IN ('High', 'Medium', 'Borderline', 'None', 'Low'));
