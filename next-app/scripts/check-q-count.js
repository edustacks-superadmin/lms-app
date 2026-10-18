const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCount() {
    const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

    if (error) console.error(error);
    else console.log('Total Questions in DB:', count);
}

checkCount();
