const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRelations() {
    try {
        console.log('Checking junction tables...');

        // Check for exam-question relations
        const { error: eqError } = await supabase.from('exam_questions').select('*').limit(1);
        console.log('exam_questions table exists:', !eqError);

        // Check for folder-question relations (guessing name)
        const possibleNames = ['folder_questions', 'question_folder_questions', 'question_folder_items'];
        for (const name of possibleNames) {
            const { error } = await supabase.from(name).select('*').limit(1);
            if (!error) console.log(`Found folder table: ${name}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkRelations();
