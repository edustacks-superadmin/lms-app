-- Add foreign key constraint from question_folder_items to questions
-- This enables Supabase PostgREST to use the relationship syntax in queries

ALTER TABLE question_folder_items
ADD CONSTRAINT question_folder_items_question_id_fkey
FOREIGN KEY (question_id)
REFERENCES questions(id)
ON DELETE CASCADE;

-- Also add foreign key to folders if it doesn't exist
ALTER TABLE question_folder_items
ADD CONSTRAINT question_folder_items_folder_id_fkey
FOREIGN KEY (folder_id)
REFERENCES question_folders(id)
ON DELETE CASCADE;

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
