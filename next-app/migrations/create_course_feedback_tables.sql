-- Course Feedback Feature - Database Migration
-- Run this in Supabase SQL Editor

-- 1. Feedback Forms (one per course)
CREATE TABLE IF NOT EXISTS public.course_feedback_forms (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    trigger_type VARCHAR(50) DEFAULT 'completion', -- completion, content, scheduled, attendance, content_count
    trigger_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    institute_id BIGINT DEFAULT 10,
    
    UNIQUE(course_id) -- One feedback form per course
);

-- 2. Feedback Questions
CREATE TABLE IF NOT EXISTS public.feedback_questions (
    id SERIAL PRIMARY KEY,
    form_id INT NOT NULL REFERENCES public.course_feedback_forms(id) ON DELETE CASCADE,
    question_type VARCHAR(20) NOT NULL DEFAULT 'rating', -- text, rating
    question_text TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Feedback Responses (student submissions)
CREATE TABLE IF NOT EXISTS public.feedback_responses (
    id SERIAL PRIMARY KEY,
    form_id INT NOT NULL REFERENCES public.course_feedback_forms(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(form_id, user_id) -- One response per user per form
);

-- 4. Individual Answers
CREATE TABLE IF NOT EXISTS public.feedback_answers (
    id SERIAL PRIMARY KEY,
    response_id INT NOT NULL REFERENCES public.feedback_responses(id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES public.feedback_questions(id) ON DELETE CASCADE,
    text_answer TEXT,
    rating_value INT CHECK (rating_value >= 1 AND rating_value <= 5)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_feedback_forms_course ON public.course_feedback_forms(course_id);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_form ON public.feedback_questions(form_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_form ON public.feedback_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_user ON public.feedback_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_answers_response ON public.feedback_answers(response_id);

-- Enable RLS
ALTER TABLE public.course_feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_answers ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.course_feedback_forms IS 'Stores feedback form configuration per course';
COMMENT ON TABLE public.feedback_questions IS 'Stores individual questions for each feedback form';
COMMENT ON TABLE public.feedback_responses IS 'Stores student feedback submissions';
COMMENT ON TABLE public.feedback_answers IS 'Stores individual answers to feedback questions';
