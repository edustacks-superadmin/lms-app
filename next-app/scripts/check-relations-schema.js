const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkExamQuestionsSchema() {
    try {
        const { data, error } = await supabase
            .from('exam_questions')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching exam_questions:', error.message);
        } else {
            console.log('exam_questions Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'Table empty');
        }

        const { data: qData, error: qError } = await supabase
            .from('questions')
            .select('*')
            .limit(1);

        if (qError) {
            console.error('Error fetching questions:', qError.message);
        } else {
            console.log('questions Columns:', qData && qData.length > 0 ? Object.keys(qData[0]) : 'Table empty');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkExamQuestionsSchema();
