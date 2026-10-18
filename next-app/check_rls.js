const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPolicies() {
    console.log('Checking policies for categories...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: "SELECT * FROM pg_policies WHERE tablename = 'categories';"
    });

    if (error) {
        console.error('Error fetching policies via RPC:', error.message);
        console.log('Trying direct query...');
        // If RPC isn't available, we might not be able to query pg_policies directly via Supabase client
        // unless it's exposed. 
    } else {
        console.log('Policies found:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkPolicies();
