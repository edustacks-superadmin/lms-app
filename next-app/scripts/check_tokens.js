const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTokens() {
    console.log('Checking push_tokens table...');
    const { data, error, count } = await supabase
        .from('push_tokens')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error fetching tokens:', error);
        return;
    }

    console.log(`Total Tokens Found: ${count}`);
    if (data.length > 0) {
        console.log('Sample Token:', data[0]);
    } else {
        console.log('No tokens found. Mobile app registration is failing.');
    }
}

checkTokens();
