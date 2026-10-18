const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findExamWithQuestions() {
    try {
        const { data, error } = await supabase
            .from('exam_questions')
            .select('exam_id')
            .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
            console.log(`Suggested Exam ID: ${data[0].exam_id}`);
        } else {
            console.log('No exam_questions found at all.');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

findExamWithQuestions();
