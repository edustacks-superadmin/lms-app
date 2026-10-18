require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PREFIX = 'https://d102ewyqwv3qiv.cloudfront.net/institute/thapovaninstitute/user_profiles/';

async function countPhotos() {
    console.log(`Counting photos starting with: ${PREFIX}`);

    const { count, error, data } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .ilike('photo_url', `${PREFIX}%`);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total count: ${count}`);
}

countPhotos();
