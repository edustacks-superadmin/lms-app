-- Add missing Testpress user fields to members table
-- Run this in Supabase SQL Editor if you want to store all Testpress data

-- Add basic fields
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add address fields
ALTER TABLE members
ADD COLUMN IF NOT EXISTS address1 TEXT,
ADD COLUMN IF NOT EXISTS address2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT;

-- Add other fields  
ALTER TABLE members
ADD COLUMN IF NOT EXISTS birth_date TEXT,
ADD COLUMN IF NOT EXISTS photo TEXT;

-- Add indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
CREATE INDEX IF NOT EXISTS idx_members_first_name ON members(first_name);
CREATE INDEX IF NOT EXISTS idx_members_last_name ON members(last_name);
