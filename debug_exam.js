import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugExam() {
    // 1. Check exams
    console.log("=== CHECKING EXAMS ===");
    const { data: exams, error: examError } = await supabase
        .from('exams')
        .select('id, title')
        .limit(5);

    if (examError) {
        console.error("Exam error:", examError);
        return;
    }

    console.log("Exams found:", exams);

    if (exams.length === 0) {
        console.log("No exams found!");
        return;
    }

    const examId = exams[0].id;
    console.log("\n=== CHECKING FIRST EXAM:", exams[0].title, "===");

    // 2. Check exam_questions for this exam
    console.log("\n--- Checking exam_questions ---");
    const { data: examQuestions, error: eqError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId);

    if (eqError) {
        console.error("exam_questions error:", eqError);
    } else {
        console.log("exam_questions count:", examQuestions.length);
        if (examQuestions.length > 0) {
            console.log("First exam_question:", examQuestions[0]);
        }
    }

    // 3. Try the nested query
    console.log("\n--- Testing nested query ---");
    const { data: nested, error: nestedError } = await supabase
        .from('exam_questions')
        .select(`
            *,
            questions (
                id,
                question_text,
                question_options (
                    id,
                    option_label,
                    option_text,
                    is_correct
                )
            )
        `)
        .eq('exam_id', examId)
        .order('order', { ascending: true });

    if (nestedError) {
        console.error("Nested query error:", nestedError);
    } else {
        console.log("Nested query results:", JSON.stringify(nested, null, 2));
    }
}

debugExam();
