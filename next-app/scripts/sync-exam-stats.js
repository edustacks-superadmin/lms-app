const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncAllExams() {
    console.log('Fetching all exams...');

    let allExams = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await supabase
            .from('exams')
            .select('id, marks_per_question, variable_marks')
            .range(from, from + step - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allExams = allExams.concat(data);
        if (data.length < step) break;
        from += step;
    }

    console.log(`Found ${allExams.length} exams. Starting sync...`);

    for (let i = 0; i < allExams.length; i++) {
        const exam = allExams[i];

        // 1. If not variable marks, sync all question marks to match exam marks_per_question
        if (!exam.variable_marks) {
            const { error: updateEqError } = await supabase
                .from('exam_questions')
                .update({ marks: exam.marks_per_question || 1 })
                .eq('exam_id', exam.id);
            if (updateEqError) console.error(`Error syncing marks for exam ${exam.id}:`, updateEqError.message);
        }

        // 2. Fetch updated questions to calculate totals
        const { data: questions, error: qError } = await supabase
            .from('exam_questions')
            .select('marks')
            .eq('exam_id', exam.id);

        if (qError) {
            console.error(`Error fetching questions for exam ${exam.id}:`, qError.message);
            continue;
        }

        const numberOfQuestions = questions.length;
        const totalMarks = questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);

        // 3. Update exam totals
        const { error: updateError } = await supabase
            .from('exams')
            .update({
                number_of_questions: numberOfQuestions,
                total_marks: totalMarks
            })
            .eq('id', exam.id);

        if (updateError) {
            console.error(`Error updating stats for exam ${exam.id}:`, updateError.message);
        }

        if ((i + 1) % 50 === 0) {
            console.log(`Progress: ${i + 1}/${allExams.length}`);
        }
    }

    console.log('Sync complete!');
}

syncAllExams().catch(console.error);
