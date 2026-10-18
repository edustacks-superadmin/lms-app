-- Add RLS policies to allow admins to view all exam attempts and answers

-- First, add policies for exam_attempts
CREATE POLICY "Admins can view all exam attempts"
ON exam_attempts FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM members
        WHERE members.email = auth.jwt() ->> 'email'
        AND members.role = 'admin'
    )
);

-- Add policy for exam_answers
CREATE POLICY "Admins can view all exam answers"
ON exam_answers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM members
        WHERE members.email = auth.jwt() ->> 'email'
        AND members.role = 'admin'
    )
);
