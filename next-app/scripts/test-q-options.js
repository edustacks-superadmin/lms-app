const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuestionsOptionsRelation() {
    try {
        console.log('Testing questions -> question_options relation');
        const { data, error } = await supabase
            .from('questions')
            .select(`
                *,
                question_options (*)
            `)
            .limit(1);

        if (error) {
            console.error('Error fetching questions with options:', error.message);
        } else {
            console.log('Relation works!');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testQuestionsOptionsRelation();
