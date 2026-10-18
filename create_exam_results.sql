-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS exam_answers CASCADE;
DROP TABLE IF EXISTS exam_attempts CASCADE;

-- Create exam_attempts table
CREATE TABLE exam_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    score NUMERIC(5, 2),
    total_marks NUMERIC(5, 2),
    status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exam_answers table
CREATE TABLE exam_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_index INTEGER, -- 0, 1, 2, 3
    is_correct BOOLEAN,
    marks_obtained NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;

-- Policies for exam_attempts
CREATE POLICY "Users can view their own attempts" 
ON exam_attempts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts" 
ON exam_attempts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" 
ON exam_attempts FOR UPDATE 
USING (auth.uid() = user_id);

-- Policies for exam_answers
CREATE POLICY "Users can view their own answers" 
ON exam_answers FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM exam_attempts 
        WHERE exam_attempts.id = exam_answers.attempt_id 
        AND exam_attempts.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own answers" 
ON exam_answers FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM exam_attempts 
        WHERE exam_attempts.id = exam_answers.attempt_id 
        AND exam_attempts.user_id = auth.uid()
    )
);
