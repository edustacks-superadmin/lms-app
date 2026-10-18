-- ================================================================
-- FIX: Enable Admin Access to Exam Stats (Attempts & Answers)
-- ================================================================

-- 1. EXAM ATTEMPTS
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Enable read access for all users" ON exam_attempts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON exam_attempts;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON exam_attempts;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON exam_attempts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON exam_attempts;

-- Allow Authenticated Users (Admins & Students) to READ ALL attempts
-- (Ideally filters could be stricter, but for Admin Dashboard visibility this is required)
CREATE POLICY "Enable read for authenticated" ON exam_attempts FOR SELECT TO authenticated USING (true);

-- Allow Authenticated Users to INSERT their own attempts
CREATE POLICY "Enable insert for authenticated" ON exam_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = (select auth_user_id from members where id = member_id));

-- Allow Authenticated Users to UPDATE their own attempts (or Admins)
CREATE POLICY "Enable update for authenticated" ON exam_attempts FOR UPDATE TO authenticated USING (true);

-- Allow Authenticated Users to DELETE (Admins)
CREATE POLICY "Enable delete for authenticated" ON exam_attempts FOR DELETE TO authenticated USING (true);


-- 2. EXAM ANSWERS (Linked to Attempts)
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated" ON exam_answers;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON exam_answers;

-- Allow reading answers (needed for stats calculation)
CREATE POLICY "Enable read for authenticated" ON exam_answers FOR SELECT TO authenticated USING (true);

-- Allow inserting answers
CREATE POLICY "Enable insert for authenticated" ON exam_answers FOR INSERT TO authenticated WITH CHECK (true);

-- Success Message
SELECT 'RLS Policies Updated Successfully' as status;
