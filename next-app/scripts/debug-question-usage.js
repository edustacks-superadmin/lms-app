const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    const questionText = "The center to center spacing of vertical stirrups, in a rectangular beam, is";
    console.log(`Searching for question: "${questionText}"...`);

    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, testpress_id, question_text')
        .ilike('question_text', `%${questionText}%`);

    if (error) {
        console.error('Error fetching question:', error);
        return;
    }

    if (!questions || questions.length === 0) {
        console.log('No matching question found.');
        return;
    }

    console.log(`Found ${questions.length} matching questions.`);

    for (const q of questions) {
        console.log(`\n--- Question ID: ${q.id} (TP: ${q.testpress_id}) ---`);

        // Check Exams
        const { data: exams, error: eError } = await supabase
            .from('exam_questions')
            .select('exam_id, exams(title)')
            .eq('question_id', q.id);

        if (eError) console.error('Error fetching exams:', eError);
        else {
            console.log(`Linked Exams (${exams.length}):`, exams.map(e => e.exams?.title).join(', '));
        }

        // Check Folders
        const { data: folders, error: fError } = await supabase
            .from('question_folder_items')
            .select('folder_id, question_folders(name)')
            .eq('question_id', q.id);

        if (fError) console.error('Error fetching folders:', fError);
        else {
            console.log(`Linked Folders (${folders.length}):`, folders.map(f => f.question_folders?.name).join(', '));
        }
    }
}

main();
