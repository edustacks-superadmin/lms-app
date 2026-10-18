-- Update members table to match Testpress user structure
-- Adds missing fields and custom_data JSONB column

-- 1. Add missing standard fields
ALTER TABLE members ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE members ADD COLUMN IF NOT EXISTS address1 TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS address2 TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS state_code TEXT;

-- 2. Add custom_data JSONB column for flexible custom fields
ALTER TABLE members ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- 3. Add role field for admin/student distinction
ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('admin', 'student'));

-- 4. Add auth_user_id for Supabase Auth integration (UUID)
ALTER TABLE members ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- 5. Remove legacy name column (using first_name + last_name instead)
ALTER TABLE members DROP COLUMN IF EXISTS name;

-- 6. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_members_custom_data ON members USING GIN (custom_data);
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);

-- 7. Add comments to document field purposes
COMMENT ON COLUMN members.role IS 'User role: admin or student';
COMMENT ON COLUMN members.gender IS 'User gender: male, female, other, or prefer_not_to_say';
COMMENT ON COLUMN members.custom_data IS 'JSONB column for storing custom fields like Testpress custom_fields';
COMMENT ON COLUMN members.auth_user_id IS 'Links to auth.users.id for Supabase Auth integration';
COMMENT ON COLUMN members.display_name IS 'Display name shown in UI (defaults to first_name + last_name)';

-- Success message
SELECT 'Members table updated with Testpress-compatible structure!' as message;
