const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkForeignKeys() {
    try {
        console.log('🔍 Checking foreign key constraints on question_folder_items table...\n');

        // Try to fetch some data to check the structure
        const { data: sampleItem, error: fetchError } = await supabase
            .from('question_folder_items')
            .select('*')
            .limit(1)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.log('Error fetching sample:', fetchError.message);
        } else if (sampleItem) {
            console.log('Sample question_folder_item:', sampleItem, '\n');
        }

        // Try the problematic query that's failing
        console.log('Testing the query that\'s failing in getFolderQuestions...\n');

        const { data, error } = await supabase
            .from('question_folder_items')
            .select('question_id, position, questions(*, options:question_options(*), tags:question_tags(*))')
            .eq('folder_id', 1906)
            .order('position', { ascending: true });

        if (error) {
            console.log('❌ Query failed with error:');
            console.log(error);
            console.log('\n📝 This confirms the foreign key relationship is missing.');
            console.log('\nTo fix this, you need to run the following SQL in your Supabase SQL editor:');
            console.log('\n---SQL---');
            console.log(`
ALTER TABLE question_folder_items
ADD CONSTRAINT question_folder_items_question_id_fkey
FOREIGN KEY (question_id)
REFERENCES questions(id)
ON DELETE CASCADE;

ALTER TABLE question_folder_items
ADD CONSTRAINT question_folder_items_folder_id_fkey
FOREIGN KEY (folder_id)
REFERENCES question_folders(id)
ON DELETE CASCADE;
            `.trim());
            console.log('---END SQL---\n');
        } else {
            console.log('✅ Query succeeded! Found', data.length, 'questions');
            console.log('Foreign key relationships are working correctly.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkForeignKeys();
