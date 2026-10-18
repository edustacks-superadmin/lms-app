-- Check for auth triggers and the members table structure
-- Run this in Supabase SQL Editor to diagnose the signup issue

-- 1. Check if members table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'members'
ORDER BY ordinal_position;

-- 2. Check for auth triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- 3. Check if there's a function to handle new user signups
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%user%' OR routine_name LIKE '%member%';
