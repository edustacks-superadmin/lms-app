require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function viewRemaining() {
    const { data, error } = await supabase
        .from('members')
        .select('email, photo_url')
        .ilike('photo_url', '%r2.dev%');

    if (error) {
        console.error(error);
        return;
    }

    console.log('Remaining R2 Records:', data);
}

viewRemaining();
