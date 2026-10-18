const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const { count, error } = await supabaseAdmin
        .from('question_folders')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Question Folders Count: ${count}`);
    }

    // Also check one item
    const { data } = await supabaseAdmin
        .from('question_folders')
        .select('name, testpress_id')
        .not('testpress_id', 'is', null)
        .limit(1);

    if (data && data.length > 0) {
        console.log('Sample synced folder:', data[0]);
    }
}

check();
