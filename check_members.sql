-- Check what data was actually imported
SELECT 
    id,
    email,
    first_name,
    last_name,
    display_name,
    created_at,
    role,
    status
FROM members 
ORDER BY id DESC 
LIMIT 10;
