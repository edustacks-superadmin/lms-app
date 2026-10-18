-- Comprehensive fix for UUID vs Integer type mismatches
-- This ensures all member_id and student_id columns use integer type to match members.id

-- ========================================
-- 1. Fix enrollments.student_id
-- ========================================
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;
ALTER TABLE enrollments DROP COLUMN IF EXISTS student_id;
ALTER TABLE enrollments ADD COLUMN student_id integer REFERENCES members(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);

-- ========================================
-- 2. Fix orders.member_id (if needed)
-- ========================================
-- Check if orders.member_id is UUID and convert to integer
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'member_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_member_id_fkey;
        ALTER TABLE orders DROP COLUMN IF EXISTS member_id;
        ALTER TABLE orders ADD COLUMN member_id integer REFERENCES members(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_orders_member_id ON orders(member_id);
    END IF;
END $$;

-- ========================================
-- 3. Fix batch_members.member_id (if needed)
-- ========================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batch_members' 
        AND column_name = 'member_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE batch_members DROP CONSTRAINT IF EXISTS batch_members_member_id_fkey;
        ALTER TABLE batch_members DROP COLUMN IF EXISTS member_id;
        ALTER TABLE batch_members ADD COLUMN member_id integer REFERENCES members(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_batch_members_member_id ON batch_members(member_id);
    END IF;
END $$;

-- ========================================
-- 4. Fix exam_attempts.member_id (if needed)
-- ========================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exam_attempts' 
        AND column_name = 'member_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE exam_attempts DROP CONSTRAINT IF EXISTS exam_attempts_member_id_fkey;
        ALTER TABLE exam_attempts DROP COLUMN IF EXISTS member_id;
        ALTER TABLE exam_attempts ADD COLUMN member_id integer REFERENCES members(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_exam_attempts_member_id ON exam_attempts(member_id);
    END IF;
END $$;

-- ========================================
-- 5. Fix content_progress.student_id (if needed)
-- ========================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_progress' 
        AND column_name = 'student_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE content_progress DROP CONSTRAINT IF EXISTS content_progress_student_id_fkey;
        ALTER TABLE content_progress DROP COLUMN IF EXISTS student_id;
        ALTER TABLE content_progress ADD COLUMN student_id integer REFERENCES members(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_content_progress_student_id ON content_progress(student_id);
    END IF;
END $$;

-- ========================================
-- Verification: Check all fixed columns
-- ========================================
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND (column_name = 'member_id' OR column_name = 'student_id')
    AND table_name IN ('enrollments', 'orders', 'batch_members', 'exam_attempts', 'content_progress')
ORDER BY table_name, column_name;
