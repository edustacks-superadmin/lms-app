UPDATE public.questions
SET question_type = 'MCQ, Single Correct Question'
WHERE question_type IS NULL;
