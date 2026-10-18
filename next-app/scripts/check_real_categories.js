
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    // 1. Setup Supabase
    const envPath = path.join(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=["']?(.*?)["']?$/m)?.[1];
    const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=["']?(.*?)["']?$/m)?.[1];

    if (!supabaseUrl || !supabaseKey) {
        console.error('Credentials not found');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const INSTITUTE_ID = 10;

    console.log('--- Fetching from Categories Table ---');
    const { data: cats, error } = await supabase
        .from('categories')
        .select('*')
        .eq('institute_id', INSTITUTE_ID);

    if (error) console.error(error);
    else {
        console.log('Categories:', cats.map(c => `${c.id}: ${c.name}`));
    }
}

main();
