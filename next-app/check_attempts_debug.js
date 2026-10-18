
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnon = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function checkDo() {
    console.log("--- Checking Exam 356 Attempts ---");
    const examId = 356;

    // 1. Check with Admin (Service Role) - Actual Data
    const { data: adminAttempts, error: adminError } = await supabaseAdmin
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId);

    if (adminError) {
        console.error("Admin Fetch Error:", adminError);
    } else {
        console.log(`[Admin] Total Attempts Found: ${adminAttempts.length}`);
        for (const a of adminAttempts) {
            console.log(` - ID: ${a.id}, Status: '${a.status}', Score: ${a.score}`);
            console.log(`   Answers:`, JSON.stringify(a.answers).substring(0, 200) + "...");

            // Check exam_answers table
            const { count, error: countError } = await supabaseAdmin
                .from('exam_answers')
                .select('*', { count: 'exact', head: true })
                .eq('attempt_id', a.id);
            console.log(`   Exam Answers Count from table: ${count} (Error: ${countError?.message})`);
        }
    }

    // 2. Check with Anon (Public) - RLS Check
    const { data: anonAttempts, error: anonError } = await supabaseAnon
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId);

    if (anonError) {
        console.error("Anon Fetch Error:", anonError);
    } else {
        console.log(`[Anon] Total Attempts Visible: ${anonAttempts.length}`);
    }
}

checkDo();
