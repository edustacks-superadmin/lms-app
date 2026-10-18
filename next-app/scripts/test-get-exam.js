const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testGetExamById(id) {
    try {
        console.log('Testing getExamById for ID:', id);
        const { data, error } = await supabase
            .from('exams')
            .select(`
                *,
                exam_questions (
                    question_id,
                    marks,
                    order,
                    questions (*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching exam:', error.message);
            console.error('Details:', error.details);
            console.error('Hint:', error.hint);
            console.error('Code:', error.code);
        } else {
            console.log('Exam found:', data.title);
            console.log('Number of questions:', data.exam_questions?.length);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testGetExamById(42);
