const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
    console.log('Checking Supabase icons bucket...');
    console.log(`Supabase URL: ${SUPABASE_URL}`);

    // List root of icons bucket
    const { data, error } = await supabase.storage
        .from('icons')
        .list('', { limit: 20 });

    if (error) {
        console.error('Error listing bucket:', error);
        return;
    }

    console.log(`Found ${data?.length || 0} items in root:`);
    data?.forEach(item => {
        console.log(`  - ${item.name} (${item.metadata ? 'file' : 'folder'})`);
    });

    // Also check Custom folder specifically
    console.log('\nChecking Custom folder...');
    const { data: customData, error: customError } = await supabase.storage
        .from('icons')
        .list('Custom', { limit: 20 });

    if (customError) {
        console.error('Error listing Custom folder:', customError);
        return;
    }

    console.log(`Found ${customData?.length || 0} items in Custom/:`);
    customData?.forEach(item => {
        console.log(`  - ${item.name}`);
    });
}

main().catch(console.error);
