const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFolderAndSubjects() {
    try {
        console.log('🔍 Checking folders and their questions with subjects...\n');

        // First, find folders that have questions
        const { data: items, error: itemsError } = await supabase
            .from('question_folder_items')
            .select('folder_id')
            .limit(1);

        if (itemsError) throw itemsError;

        if (!items || items.length === 0) {
            console.log('⚠️  No question_folder_items found');
            return;
        }

        const folderId = items[0].folder_id;
        console.log(`Testing with folder ID: ${folderId}\n`);

        // Test the updated query
        const { data, error } = await supabase
            .from('question_folder_items')
            .select('question_id, position, questions(*, options:question_options(*), tags:question_tags(*), subjects(*))')
            .eq('folder_id', folderId)
            .order('position', { ascending: true })
            .limit(2);

        if (error) {
            console.log('❌ Query failed with error:');
            console.log(error);
            console.log('\n📝 This means there might be a missing foreign key between questions and subjects.');
            console.log('\nYou may need to run this SQL in Supabase SQL Editor:');
            console.log(`
ALTER TABLE questions
ADD CONSTRAINT questions_subject_id_fkey
FOREIGN KEY (subject_id)
REFERENCES subjects(id)
ON DELETE SET NULL;
            `.trim());
        } else {
            console.log('✅ Query succeeded!');
            console.log(`\nFound ${data.length} questions in folder ${folderId}\n`);

            data.forEach((item, idx) => {
                console.log(`Question ${idx + 1}:`);
                console.log(`  Question ID: ${item.question_id}`);
                console.log(`  Position: ${item.position}`);
                console.log(`  Question Text: ${item.questions?.question_text?.substring(0, 80)}...`);
                console.log(`  Subject ID: ${item.questions?.subject_id || 'N/A'}`);

                if (item.questions?.subjects) {
                    console.log(`  ✅ Subject Name: ${item.questions.subjects.name}`);
                } else {
                    console.log(`  ⚠️  No subject data - might need FK or question has no subject_id`);
                }
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkFolderAndSubjects();
