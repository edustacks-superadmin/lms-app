
-- Check posts table schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'posts';

-- Check RLS policies for posts
SELECT * FROM pg_policies WHERE tablename = 'posts';
