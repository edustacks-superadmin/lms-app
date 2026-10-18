ALTER TABLE public.questions ADD COLUMN question_type VARCHAR(50);
CREATE INDEX idx_questions_type ON public.questions(question_type);
