
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function checkExam358() {
    console.log("--- Checking Exam 358 Attempts ---");
    const examId = 358;

    const { data: attempts, error } = await supabaseAdmin
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId);

    if (error) {
        console.error("Error:", error);
        return;
    }

    for (const a of attempts) {
        console.log(`\nAttempt ID: ${a.id}`);
        console.log(`Started: ${a.started_at}`);
        console.log(`Submitted: ${a.submitted_at}`);
        console.log(`Score: ${a.score}`);
        console.log(`Answers Type: ${typeof a.answers}`);
        // Log the first 500 chars of JSON to see structure
        console.log(`Answers Content:`, JSON.stringify(a.answers, null, 2).substring(0, 500));

        // Count keys
        if (a.answers) {
            const keys = Object.keys(a.answers);
            console.log(`Answer Keys Count: ${keys.length}`);
        }
    }
}

checkExam358();
