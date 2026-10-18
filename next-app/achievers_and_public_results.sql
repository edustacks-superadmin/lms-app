-- Add Achiever flag to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS is_achiever BOOLEAN DEFAULT FALSE;

-- Create Member Achievements table
-- CHANGED: member_id is now BIGINT to match existing members.id type (was erroneously UUID)
CREATE TABLE IF NOT EXISTS member_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  rank TEXT,
  year TEXT,
  quote TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Public Results flag and date to exams table
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS is_public_result BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS result_publish_date TIMESTAMP WITH TIME ZONE;

-- RLS POLICIES

-- 1. Public can view achievers
DROP POLICY IF EXISTS "Public can view achievers" ON members;
CREATE POLICY "Public can view achievers"
ON members FOR SELECT
TO public
USING (is_achiever = true);

-- 2. Public can view achievements
ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view achievements" ON member_achievements;
CREATE POLICY "Public can view achievements"
ON member_achievements FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.id = member_achievements.member_id
    AND members.is_achiever = true
  )
);

-- 3. Public can view public exams
DROP POLICY IF EXISTS "Public can view public exams" ON exams;
CREATE POLICY "Public can view public exams"
ON exams FOR SELECT
TO public
USING (is_public_result = true);

-- 4. Public can view public exam attempts
DROP POLICY IF EXISTS "Public can view public exam attempts" ON exam_attempts;
CREATE POLICY "Public can view public exam attempts"
ON exam_attempts FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM exams
    WHERE exams.id = exam_attempts.exam_id
    AND exams.is_public_result = true
  )
);

-- 5. Public can view members who participated in public exams (for Leaderboard)
-- helper function to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.has_public_attempts(_member_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM exam_attempts ea
    JOIN exams e ON ea.exam_id = e.id
    WHERE ea.member_id = _member_id
    AND e.is_public_result = true
  );
$$;

DROP POLICY IF EXISTS "Public can view participants of public exams" ON members;
CREATE POLICY "Public can view participants of public exams"
ON members FOR SELECT
TO public
USING (
  has_public_attempts(id)
);
