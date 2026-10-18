const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumn() {
    console.log('Checking for view_count column in posts table...');
    const { data, error } = await supabase
        .from('posts')
        .select('id, view_count')
        .limit(1);

    if (error) {
        if (error.code === '42703') {
            console.log('COLUMN DOES NOT EXIST: view_count');
        } else {
            console.error('Error fetching data:', error);
        }
    } else {
        console.log('COLUMN EXISTS: view_count');
        console.log('Sample data:', data);
    }
}

checkColumn();
