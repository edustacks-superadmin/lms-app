const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('--- Config Check ---');
console.log('Script URL:', process.env.NEXT_PUBLIC_SUPABASE_URL); // <--- Print this
// console.log('Mobile URL:', 'https://xalbtjoykovnlbjeddtv.supabase.co'); // Comparison

async function checkResumeCounts() {
    const { data: memberData } = await supabase
        .from('members')
        .select('id, auth_user_id, email')
        .eq('email', 'reviewer@test.com')
        .single();

    if (memberData) {
        console.log(`\n\n[CHECK] Member: ${memberData.email}`);
        console.log(`[CHECK] ID: ${memberData.id}`);
        console.log(`[CHECK] AUTH_USER_ID: ${memberData.auth_user_id}`); // <--- This is what I need
    } else {
        console.log('[CHECK] Member not found');
    }
}

checkResumeCounts();
