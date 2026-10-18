-- 1. Check the latest order
SELECT 'Latest Order' as label, id, user_email, product_id, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Check the Member associated with the order (Removed first_name)
SELECT 'Member' as label, id, email
FROM members 
WHERE email = (SELECT user_email FROM orders ORDER BY created_at DESC LIMIT 1);

-- 3. Check the Product associated with the order
SELECT 'Product' as label, id, title, course_id 
FROM products 
WHERE id = (SELECT product_id FROM orders ORDER BY created_at DESC LIMIT 1);

-- 4. Check Course linkage
-- First, just show the column type
SELECT 'Column Info' as label, column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'courses' AND column_name = 'allowed_products';

-- Show courses that might match (listing all for manual inspection if few, or filtering safely)
SELECT 'Courses with Allowed Products' as label, id, title, allowed_products
FROM courses 
WHERE allowed_products IS NOT NULL
LIMIT 5;

-- 5. Check Enrollments for the student
SELECT 'Enrollments' as label, id, course_id, status, enrolled_at
FROM enrollments 
WHERE student_id = (
    SELECT id 
    FROM members 
    WHERE email = (SELECT user_email FROM orders ORDER BY created_at DESC LIMIT 1)
);
