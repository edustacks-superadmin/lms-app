const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addQuestionsToFolder() {
    try {
        console.log('📁 Adding questions to folder "590 GT (2000 Qns)"\n');

        const folderId = 1; // From previous check

        // Get the 10 questions
        const { data: questions } = await supabase
            .from('questions')
            .select('id, question_text')
            .eq('subject_id', 275) // 590 U1
            .order('id', { ascending: true });

        console.log(`Found ${questions.length} questions to add\n`);

        // Prepare items to insert
        // Position them in the order they appear (ID 1 = Position 1, etc.)
        const itemsToInsert = questions.map((q, index) => ({
            folder_id: folderId,
            question_id: q.id,
            position: index + 1
        }));

        console.log('Adding questions to folder...\n');

        // Insert all at once
        const { data: inserted, error } = await supabase
            .from('question_folder_items')
            .insert(itemsToInsert)
            .select();

        if (error) throw error;

        console.log(`✅ Successfully added ${inserted.length} questions to folder!\n`);

        // Display the order
        console.log('Questions added in order:\n');
        questions.forEach((q, idx) => {
            const preview = q.question_text.replace(/<[^>]*>/g, '').substring(0, 80);
            console.log(`  Position ${idx + 1}: Question ID ${q.id}`);
            console.log(`    ${preview}...\n`);
        });

        console.log('✅ Complete! The folder now has questions in the correct order.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

addQuestionsToFolder();
