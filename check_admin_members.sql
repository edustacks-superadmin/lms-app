-- Check for admin users in members table
SELECT user_id, name, email, role 
FROM members 
WHERE role IN ('admin', 'super_admin');

-- Also check if there are any comments where the user is NOT in members
SELECT pc.user_id, pc.content
FROM post_comments pc
LEFT JOIN members m ON pc.user_id = m.user_id
WHERE m.user_id IS NULL;
