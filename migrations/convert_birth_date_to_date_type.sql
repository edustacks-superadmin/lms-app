-- Migration: Change birth_date column from TEXT/TIMESTAMP to DATE type
-- This ensures birth dates are stored as simple dates (YYYY-MM-DD) without time components

-- Step 1: Update existing data to remove time components
-- Convert any timestamp values to just the date part
UPDATE members 
SET birth_date = CASE 
    WHEN birth_date IS NOT NULL AND birth_date != '' 
    THEN CAST(birth_date::timestamp AS DATE)::text
    ELSE NULL 
END
WHERE birth_date IS NOT NULL AND birth_date != '';

-- Step 2: Alter column type from TEXT to DATE
ALTER TABLE members 
ALTER COLUMN birth_date TYPE DATE USING 
    CASE 
        WHEN birth_date IS NOT NULL AND birth_date != '' 
        THEN birth_date::date 
        ELSE NULL 
    END;

-- Step 3: Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'members' AND column_name = 'birth_date';

-- Success message
SELECT 'birth_date column successfully converted to DATE type!' as message;
