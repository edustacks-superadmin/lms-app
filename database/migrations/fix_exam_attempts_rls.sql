-- Fix RLS policy for exam_attempts to allow students to submit exams
-- regardless of whether the course is public or not

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Public Exam Attempts Insert" ON exam_attempts;

-- Create a more permissive INSERT policy
-- Students can insert exam attempts if:
-- 1. They are authenticated
-- 2. The member_id matches their user account
CREATE POLICY "Students can submit exam attempts"
ON exam_attempts FOR INSERT
WITH CHECK (
    -- User must be authenticated and member_id must match
    member_id IN (
        SELECT id FROM members 
        WHERE auth_user_id = auth.uid()
    )
);

-- Also ensure UPDATE policy allows students to update their own attempts
DROP POLICY IF EXISTS "Public Exam Attempts Update" ON exam_attempts;

CREATE POLICY "Students can update their own attempts"
ON exam_attempts FOR UPDATE
USING (
    member_id IN (
        SELECT id FROM members 
        WHERE auth_user_id = auth.uid()
    )
)
WITH CHECK (
    member_id IN (
        SELECT id FROM members 
        WHERE auth_user_id = auth.uid()
    )
);
