const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testExamQuestionsRelation() {
    try {
        console.log('Testing exam_questions -> questions relation');
        const { data, error } = await supabase
            .from('exam_questions')
            .select(`
                question_id,
                marks,
                order,
                questions (*)
            `)
            .limit(1);

        if (error) {
            console.error('Error fetching exam_questions:', error.message);
        } else {
            console.log('Relation works! Sample:', data?.[0]?.questions?.question_text || 'No question linked');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testExamQuestionsRelation();
