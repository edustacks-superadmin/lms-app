-- Add missing columns to members table for bulk upload support
-- These columns are used in MembersManagement.jsx and UserContext.jsx

ALTER TABLE members
ADD COLUMN IF NOT EXISTS joining_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS report_card_url TEXT,
ADD COLUMN IF NOT EXISTS orders JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN members.joining_date IS 'Date when the member joined';
COMMENT ON COLUMN members.expiry_date IS 'Date when the member subscription expires';
COMMENT ON COLUMN members.is_active IS 'Whether the member is active';
COMMENT ON COLUMN members.is_blocked IS 'Whether the member is blocked';
COMMENT ON COLUMN members.report_card_url IS 'URL to the member report card';
COMMENT ON COLUMN members.orders IS 'JSON data of member orders';

-- Success message
SELECT 'Members table updated with joining_date, expiry_date, and other missing columns' as message;
