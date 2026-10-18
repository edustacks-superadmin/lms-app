const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load envs
const envFiles = ['.env', '.env.local'];
envFiles.forEach(file => {
    if (fs.existsSync(file)) {
        dotenv.config({ path: file });
    }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function countMissing() {
    const { count, error } = await supabase
        .from('external_exam_results')
        .select('*', { count: 'exact', head: true })
        .is('member_id', null);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`\nTotal records missing member_id: ${count}`);

        // Also get unique emails
        const { data: uniqueEmails, error: emailError } = await supabase
            .from('external_exam_results')
            .select('email')
            .is('member_id', null);

        if (!emailError) {
            const emails = new Set(uniqueEmails.map(r => r.email).filter(Boolean));
            console.log(`Unique emails to register: ${emails.size}\n`);
        }
    }
}

countMissing();
