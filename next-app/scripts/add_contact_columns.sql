-- Add new columns for enhanced student tracking
ALTER TABLE external_exam_results 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id);

-- Optional: Create an index on member_id for faster lookups later
CREATE INDEX IF NOT EXISTS idx_external_results_member_id ON external_exam_results(member_id);
