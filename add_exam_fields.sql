-- Add new columns for enhanced exam creation logic
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS marks_per_question numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS number_of_questions integer DEFAULT 0;

-- Comment on columns
COMMENT ON COLUMN public.exams.marks_per_question IS 'Marks assigned to each question in the exam';
COMMENT ON COLUMN public.exams.number_of_questions IS 'Total number of questions in the exam';
