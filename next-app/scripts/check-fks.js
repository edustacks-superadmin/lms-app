const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkForeignKeys() {
    try {
        const { data, error } = await supabase.rpc('get_foreign_keys', { t_name: 'exam_questions' });

        if (error) {
            // If RPC doesn't exist, try a direct query to information_schema via a different method if possible
            // or just try to select and see if we can deduce anything.
            // Since I can't run arbitrary SQL easily without an RPC, I'll try to find a migration or check if I can create the RPC.
            console.error('Error fetching foreign keys via RPC:', error.message);

            // Try to query common columns
            const { data: cols, error: colErr } = await supabase
                .from('exam_questions')
                .select('*')
                .limit(0);

            if (colErr) throw colErr;
            console.log('Columns in exam_questions:', Object.keys(cols?.[0] || {}));
        } else {
            console.log('Foreign Keys for exam_questions:', data);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Since get_foreign_keys might not exist, let's try to run a raw SQL if we have a tool for it.
// I don't have a direct SQL tool, but I can check migrations.
checkForeignKeys();
