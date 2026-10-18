const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFixedGetExam(id) {
    try {
        console.log(`Testing fixed getExamById approach for ID: ${id}`);

        // Step 1: Fetch exam
        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('*')
            .eq('id', id)
            .single();

        if (examError) throw examError;
        console.log(`Found exam: ${exam.title}`);

        // Step 2: Fetch exam questions
        const { data: eqData, error: eqError } = await supabase
            .from('exam_questions')
            .select('*')
            .eq('exam_id', id);

        if (eqError) throw eqError;
        console.log(`Found ${eqData?.length || 0} exam_questions`);

        if (eqData && eqData.length > 0) {
            const questionIds = eqData.map(eq => eq.question_id).filter(Boolean);
            console.log(`Question IDs: ${questionIds.join(', ')}`);

            if (questionIds.length > 0) {
                // Step 3: Fetch questions
                const { data: questions, error: qError } = await supabase
                    .from('questions')
                    .select('*')
                    .in('id', questionIds);

                if (qError) throw qError;
                console.log(`Found ${questions?.length || 0} details for questions`);

                // Construct final object
                exam.exam_questions = eqData.map(eq => ({
                    ...eq,
                    questions: questions.find(q => q.id === eq.question_id)
                }));

                console.log('Successfully reconstructed exam object with questions!');
            }
        }

        console.log('Test successful!');
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testFixedGetExam(1896);
