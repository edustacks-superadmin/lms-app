const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    // We can't easily get FK definitions via JS client without querying system tables using RPC or raw SQL if enabled.
    // But we can try to select safely.

    console.log("Checking exam_questions content...");
    const { data, error } = await supabase
        .from('exam_questions')
        .select('*')
        .limit(1);

    if (error) console.error("Error selecting *:", error);
    else console.log("Sample row:", data);

    // Try joining manually? No, we need to fix the relationship.
    // If the error says "Could not find a relationship", it's likely missing in PostgREST cache or not there.
    // The user's environment is local dev? No, it's Supabase (remote).

    // Attempt to list columns via existing script logic?
    // Let's just output the sample data to see if columns are named correctly (exam_id, question_id).
}

checkSchema();
