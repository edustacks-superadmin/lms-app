-- Temporarily disable RLS on members table to fix authentication
-- This allows all authenticated users to read the members table

ALTER TABLE members DISABLE ROW LEVEL SECURITY;
