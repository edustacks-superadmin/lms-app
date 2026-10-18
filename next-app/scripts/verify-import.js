
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
    // Get latest question
    const { data: q, error } = await supabase
        .from('questions')
        .select(`
            id, testpress_id, question_text, subject_id,
            question_options ( id, option_text, is_correct )
        `)
        .order('id', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    const { count } = await supabase
        .from('exam_questions')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', q.id);

    console.log('--- Verification ---');
    console.log(`ID: ${q.id} (TP: ${q.testpress_id})`);
    console.log(`Text: ${q.question_text.substring(0, 50)}...`);
    console.log(`Subject ID: ${q.subject_id}`);
    console.log(`Options Count: ${q.question_options.length}`);
    q.question_options.forEach(o => {
        console.log(` - [${o.is_correct ? 'X' : ' '}] ${o.option_text.substring(0, 30)}...`);
    });
    console.log(`Exam Links: ${count}`);
}

verify();
