-- Check the user_id in post_comments
SELECT pc.content, pc.user_id, m.name 
FROM post_comments pc
LEFT JOIN members m ON pc.user_id = m.user_id;

-- Check RLS policies on members table
SELECT * FROM pg_policies WHERE tablename = 'members';
