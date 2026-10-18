
-- 1. Index for fast exam filtering (Critical for filtering by exam_tag)
CREATE INDEX IF NOT EXISTS idx_ext_results_exam_tag 
ON external_exam_results(exam_tag);

-- 2. Partial index for verified users (Optimizes "Show Verified" filter & stats count)
CREATE INDEX IF NOT EXISTS idx_ext_results_verified 
ON external_exam_results(is_verified) 
WHERE is_verified = true;

-- 3. Index for Registration Number (Critical for Search & Auto-Sync lookups)
CREATE INDEX IF NOT EXISTS idx_ext_results_reg_no 
ON external_exam_results(registration_number);

-- 4. Composite index for Application lookups (exam_tag + member_id)
CREATE INDEX IF NOT EXISTS idx_exam_apps_exam_member 
ON exam_applications(exam_tag, member_id);

-- 5. Index for Member search (Name/Email) - using GIN for pattern matching if supported, or standard btree for prefix
CREATE INDEX IF NOT EXISTS idx_members_display_name_trgm 
ON members USING gist (display_name gist_trgm_ops);
-- Note: pg_trgm extension required for the above. Using simple btree for now:
CREATE INDEX IF NOT EXISTS idx_members_display_name 
ON members(display_name);

CREATE INDEX IF NOT EXISTS idx_members_email 
ON members(email);
