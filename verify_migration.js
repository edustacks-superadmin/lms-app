import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyMigration() {
    console.log('\n=== MIGRATION VERIFICATION ===\n');

    // 1. Check Exams
    const { data: exams, error: examError } = await supabase
        .from('exams')
        .select('id, title, duration_minutes, total_marks, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (examError) {
        console.error('Error fetching exams:', examError.message);
    } else {
        console.log(`\n📋 Recently Imported Exams (${exams.length}):\n`);
        exams.forEach((exam, idx) => {
            console.log(`${idx + 1}. ${exam.title}`);
            console.log(`   ID: ${exam.id}`);
            console.log(`   Duration: ${exam.duration_minutes} mins | Marks: ${exam.total_marks}`);
            console.log(`   Created: ${new Date(exam.created_at).toLocaleString()}\n`);
        });
    }

    // 2. Check Questions count
    const { count: questionCount, error: qError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

    if (!qError) {
        console.log(`\n📝 Total Questions: ${questionCount}`);
    }

    // 3. Check Exam-Question Relationships
    const { count: examQCount, error: eqError } = await supabase
        .from('exam_questions')
        .select('*', { count: 'exact', head: true });

    if (!eqError) {
        console.log(`🔗 Total Exam-Question Links: ${examQCount}`);
    }

    // 4. Check Options
    const { count: optionCount, error: oError } = await supabase
        .from('question_options')
        .select('*', { count: 'exact', head: true });

    if (!oError) {
        console.log(`✅ Total Question Options: ${optionCount}\n`);
    }

    // 5. Sample Question with Options
    const { data: sampleQuestion, error: sqError } = await supabase
        .from('questions')
        .select(`
            id,
            question_text,
            marks,
            question_options (
                option_label,
                option_text,
                is_correct
            )
        `)
        .limit(1)
        .single();

    if (!sqError && sampleQuestion) {
        console.log('\n📖 Sample Question:\n');
        console.log(`Question: ${sampleQuestion.question_text.substring(0, 100)}...`);
        console.log(`Marks: ${sampleQuestion.marks}`);
        console.log('\nOptions:');
        sampleQuestion.question_options.forEach(opt => {
            const marker = opt.is_correct ? '✓' : ' ';
            console.log(`  [${marker}] ${opt.option_label}. ${opt.option_text.substring(0, 50)}...`);
        });
    }

    console.log('\n=== VERIFICATION COMPLETE ===\n');
}

verifyMigration();
