const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

async function run() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const searchText = "fluid-filled (oil or gas) cables";
        console.log(`Searching for question containing: "${searchText}"...`);

        const { data: questions, error } = await supabase
            .from('questions')
            .select('id, question_text, explanation')
            .ilike('explanation', `%${searchText}%`)
            .limit(1);

        if (error) throw error;

        if (questions && questions.length > 0) {
            console.log('Found Question:');
            console.log('ID:', questions[0].id);
            console.log('Explanation Raw:', JSON.stringify(questions[0].explanation));
        } else {
            console.log('Question not found by explanation search. Trying question_text...');
            const { data: q2 } = await supabase
                .from('questions')
                .select('id, explanation')
                .ilike('question_text', `%${searchText}%`)
                .limit(1);

            if (q2 && q2.length > 0) {
                console.log('Found Question by text:');
                console.log('ID:', q2[0].id);
                console.log('Explanation Raw:', JSON.stringify(q2[0].explanation));
            } else {
                console.log('Question not found.');
            }
        }

    } catch (e) {
        console.error(e);
    }
}

run();
