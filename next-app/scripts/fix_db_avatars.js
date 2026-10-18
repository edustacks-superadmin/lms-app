require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// The 2 valid URLs we want to KEEP
const KEEP_URLS = [
    'https://pub-7ebc64389e3648b195eaa7d615ca4216.r2.dev/avatars/13775.jpeg',
    'https://pub-7ebc64389e3648b195eaa7d615ca4216.r2.dev/avatars/profiles/8290c33d-bd3a-4578-af0e-78084da27d3e.jpg'
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixDatabase() {
    console.log('Fixing Database Records...');

    // 1. Check count of R2 URLs
    const { count: initialCount } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .ilike('photo_url', '%r2.dev%');

    console.log(`Current R2 records in DB: ${initialCount}`);

    // 2. Update
    // We update all that contain 'r2.dev' but are NOT in our keep list
    const { error, count, data } = await supabase
        .from('members')
        .update({ photo_url: null })
        .ilike('photo_url', '%r2.dev%')
        .not('photo_url', 'in', `(${KEEP_URLS.join(',')})`)
        .select('id'); // select id to get the count of updated rows locally if needed

    if (error) {
        console.error('Error updating DB:', error);
    } else {
        console.log(`Successfully nullified ${data.length} records.`);
    }
}

fixDatabase();
