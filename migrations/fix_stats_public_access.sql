-- ================================================================
-- FIX: Allow Public Read Access for Exam Stats
-- (Since the app accesses data as 'anon' via Supabase Client)
-- ================================================================

-- 1. EXAM ATTEMPTS
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

-- Drop previous strict policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON exam_attempts;
DROP POLICY IF EXISTS "Enable read for authenticated" ON exam_attempts;

-- Allow PUBLIC (Anon + Authenticated) to READ attempts
-- This mimics likely settings of other tables like 'exams'
CREATE POLICY "Enable read for all" ON exam_attempts FOR SELECT TO public USING (true);


-- 2. EXAM ANSWERS
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated" ON exam_answers;

-- Allow PUBLIC reading of answers
CREATE POLICY "Enable read for all" ON exam_answers FOR SELECT TO public USING (true);


-- Success Message
SELECT 'RLS Policies Updated to Allow Public Read' as status;
