-- Optional: Create a database function to reorder questions after deletion
-- This ensures there are no gaps in numbering

CREATE OR REPLACE FUNCTION reorder_folder_questions(p_folder_id UUID, p_removed_position INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Decrement position for all questions after the removed one
    UPDATE question_folder_items
    SET position = position - 1
    WHERE folder_id = p_folder_id
    AND position > p_removed_position;
END;
$$ LANGUAGE plpgsql;
