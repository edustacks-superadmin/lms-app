const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQuestionsInFolder() {
    try {
        console.log('🔍 Checking if questions are in folder "590 GT (2000 Qns)"\n');

        // Find the folder
        const { data: folders, error: folderError } = await supabase
            .from('question_folders')
            .select('*')
            .ilike('name', '%590 GT%')
            .limit(1);

        if (folderError) throw folderError;

        if (!folders || folders.length === 0) {
            console.log('❌ Folder "590 GT (2000 Qns)" not found\n');
            return;
        }

        const folder = folders[0];
        console.log(`✅ Found folder: "${folder.name}" (ID: ${folder.id})\n`);

        // Check how many questions are in this folder
        const { data: folderItems, error: itemsError, count } = await supabase
            .from('question_folder_items')
            .select('question_id, position', { count: 'exact' })
            .eq('folder_id', folder.id)
            .order('position', { ascending: true });

        if (itemsError) throw itemsError;

        console.log(`📊 Questions in folder: ${count || 0}\n`);

        if (!folderItems || folderItems.length === 0) {
            console.log('⚠️  No questions are linked to this folder!\n');

            // Check if the 10 questions exist in the database
            console.log('Checking for imported questions with subject "590 U1" (ID: 275)...\n');
            const { data: allQuestions } = await supabase
                .from('questions')
                .select('id, question_text, created_at')
                .eq('subject_id', 275)
                .order('id', { ascending: true });

            console.log(`Found ${allQuestions?.length || 0} questions with subject "590 U1":\n`);
            allQuestions?.forEach((q, idx) => {
                const preview = q.question_text.replace(/<[^>]*>/g, '').substring(0, 80);
                console.log(`  ${idx + 1}. ID: ${q.id} - ${preview}...`);
            });

            console.log('\n💡 Recommendation:');
            console.log(`   The 10 questions need to be added to folder "${folder.name}"`);
        } else {
            console.log('Questions in folder (ordered by position):\n');

            // Fetch question details separately
            const questionIds = folderItems.map(item => item.question_id);
            const { data: questions } = await supabase
                .from('questions')
                .select('id, question_text')
                .in('id', questionIds);

            // Create a map for quick lookup
            const questionMap = {};
            questions?.forEach(q => {
                questionMap[q.id] = q;
            });

            folderItems.forEach((item, idx) => {
                const question = questionMap[item.question_id];
                if (question) {
                    const preview = question.question_text
                        .replace(/<[^>]*>/g, '')
                        .substring(0, 80);
                    console.log(`  ${idx + 1}. Position: ${item.position}, Question ID: ${item.question_id}`);
                    console.log(`     Preview: ${preview}...\n`);
                }
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkQuestionsInFolder();
