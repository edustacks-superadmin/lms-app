-- Check for any triggers on members table that might be causing UUID errors

-- List all triggers on members table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'members';

-- Check RLS policies on members table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'members';
