-- Add slug column to identify institutes by subdomain
ALTER TABLE institute_settings 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Update the existing (first) institute to have 'default' or 'demo' slug
-- Change 'demo' to whatever you want your main subdomain to be
UPDATE institute_settings 
SET slug = 'demo' 
WHERE slug IS NULL;

-- Make it required after population
ALTER TABLE institute_settings 
ALTER COLUMN slug SET NOT NULL;

-- Enable Public Read on slug column (implicitly handled by RLS, but just in case)
-- (No extra policy needed beyond the Select All policy we added)
