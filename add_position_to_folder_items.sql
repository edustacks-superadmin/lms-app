-- Add position field to question_folder_items table for persistent numbering

-- Step 1: Add position column
ALTER TABLE question_folder_items 
ADD COLUMN position INTEGER DEFAULT 0;

-- Step 2: Update existing records with sequential positions per folder
-- Using id for ordering since created_at doesn't exist
UPDATE question_folder_items 
SET position = numbered.row_number 
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY folder_id ORDER BY id) as row_number
  FROM question_folder_items
) AS numbered
WHERE question_folder_items.id = numbered.id;

-- Step 3: Create index for better performance
CREATE INDEX idx_question_folder_items_position ON question_folder_items(folder_id, position);

-- Verify the update
SELECT folder_id, question_id, position 
FROM question_folder_items 
ORDER BY folder_id, position 
LIMIT 20;
