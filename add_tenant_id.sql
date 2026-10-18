DO $$ 
DECLARE 
    default_institute_id BIGINT;
    target_table text;
    tables TEXT[] := ARRAY[
        'banner_ads', 'batch_courses', 'batch_members', 'batches', 
        'bookmarks', 'categories', 'chapter_contents', 'chapters', 
        'content_progress', 'course_exams', 'course_tags', 'courses', 
        'enrollments', 'exam_answers', 'exam_attempts', 'exam_questions', 
        'exam_sections', 'exam_tags', 'exams', 'home_settings', 
        'lesson_progress', 'members', 'offers', 'orders', 
        'post_batches', 'post_comments', 'posts', 'product_categories', 
        'products', 'question_bookmarks', 'question_folder_items', 
        'question_folders', 'question_options', 'question_reports', 
        'question_tags', 'questions', 'quotes', 'registration_fields', 
        'subjects', 'subscriptions', 'tags', 'testimonials', 'transactions'
    ];
BEGIN 
    -- 1. Get the current single institute ID to assign to existing data
    SELECT id INTO default_institute_id FROM institute_settings LIMIT 1;
    
    IF default_institute_id IS NULL THEN
        RAISE EXCEPTION 'No Institute found in institute_settings. Cannot migrate existing data.';
    END IF;

    RAISE NOTICE 'Migrating data to Institute ID: %', default_institute_id;

    -- 2. Loop through all tables
    FOREACH target_table IN ARRAY tables
    LOOP
        RAISE NOTICE 'Processing table: %', target_table;

        -- Add institute_id column if it doesn't exist
        EXECUTE format('
            ALTER TABLE %I 
            ADD COLUMN IF NOT EXISTS institute_id BIGINT 
            REFERENCES institute_settings(id) 
            DEFAULT %L
        ', target_table, default_institute_id);
        
        -- Update existing NULL rows (double check)
        EXECUTE format('
            UPDATE %I SET institute_id = %L WHERE institute_id IS NULL
        ', target_table, default_institute_id);

        -- Optional: Enable RLS (You can run this later if currently problematic)
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);

    END LOOP;

    -- 3. Special Handling for Members RLS (Example)
    -- This ensures users can see their own profile.
    -- More complex policies will be needed for other tables later.
    EXECUTE 'DROP POLICY IF EXISTS "Users view own profile" ON members';
    EXECUTE 'CREATE POLICY "Users view own profile" ON members USING (email = auth.jwt()->>''email'')';

END $$;
