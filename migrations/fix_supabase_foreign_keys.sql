-- ============================================
-- FIX SUPABASE FOREIGN KEY RELATIONSHIPS
-- ============================================
-- This script adds missing foreign key constraints and reloads Supabase schema cache

-- 1. SUBSCRIPTIONS <-> BATCHES
-- ============================================
DO $$ 
BEGIN
    -- Check if foreign key exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_batch_id_fkey'
        AND table_name = 'subscriptions'
    ) THEN
        -- Add foreign key if it doesn't exist
        ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_batch_id_fkey 
        FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added foreign key: subscriptions.batch_id -> batches.id';
    ELSE
        RAISE NOTICE '⏭️  Foreign key subscriptions_batch_id_fkey already exists';
    END IF;
END $$;

-- 2. SUBSCRIPTIONS <-> MEMBERS
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_member_id_fkey'
        AND table_name = 'subscriptions'
    ) THEN
        ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_member_id_fkey 
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added foreign key: subscriptions.member_id -> members.id';
    ELSE
        RAISE NOTICE '⏭️  Foreign key subscriptions_member_id_fkey already exists';
    END IF;
END $$;

-- 3. ORDERS <-> PRODUCTS
-- ============================================
-- Note: orders table might have product_id or might be many-to-many via order_items
-- Check if product_id column exists first
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'product_id'
    ) THEN
        -- Add foreign key for product_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'orders_product_id_fkey'
            AND table_name = 'orders'
        ) THEN
            ALTER TABLE orders 
            ADD CONSTRAINT orders_product_id_fkey 
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
            
            RAISE NOTICE '✅ Added foreign key: orders.product_id -> products.id';
        ELSE
            RAISE NOTICE '⏭️  Foreign key orders_product_id_fkey already exists';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  orders table does not have product_id column (might use order_items)';
    END IF;
END $$;

-- 4. ORDERS <-> MEMBERS
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'member_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'orders_member_id_fkey'
            AND table_name = 'orders'
        ) THEN
            ALTER TABLE orders 
            ADD CONSTRAINT orders_member_id_fkey 
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
            
            RAISE NOTICE '✅ Added foreign key: orders.member_id -> members.id';
        ELSE
            RAISE NOTICE '⏭️  Foreign key orders_member_id_fkey already exists';
        END IF;
    END IF;
END $$;

-- 5. EXAMS <-> COURSES (via course_exams junction table)
-- ============================================
-- Check if course_exams table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'course_exams'
    ) THEN
        -- Add foreign key for course_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'course_exams_course_id_fkey'
        ) THEN
            ALTER TABLE course_exams 
            ADD CONSTRAINT course_exams_course_id_fkey 
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
            
            RAISE NOTICE '✅ Added foreign key: course_exams.course_id -> courses.id';
        ELSE
            RAISE NOTICE '⏭️  Foreign key course_exams_course_id_fkey already exists';
        END IF;
        
        -- Add foreign key for exam_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'course_exams_exam_id_fkey'
        ) THEN
            ALTER TABLE course_exams 
            ADD CONSTRAINT course_exams_exam_id_fkey 
            FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;
            
            RAISE NOTICE '✅ Added foreign key: course_exams.exam_id -> exams.id';
        ELSE
            RAISE NOTICE '⏭️  Foreign key course_exams_exam_id_fkey already exists';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  course_exams table does not exist';
    END IF;
END $$;

-- 6. RELOAD SUPABASE SCHEMA CACHE
-- ============================================
-- This is critical! Supabase needs to reload its schema cache to recognize the new foreign keys
NOTIFY pgrst, 'reload schema';

-- 7. VERIFY FOREIGN KEYS
-- ============================================
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('subscriptions', 'orders', 'course_exams', 'exams')
ORDER BY tc.table_name, tc.constraint_name;

-- Success message
SELECT '✅ Foreign key relationships fixed! Supabase schema cache reloaded.' AS status;
