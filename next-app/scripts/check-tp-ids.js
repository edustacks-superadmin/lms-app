
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkNonNullIds() {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('id, testpress_id')
            .not('testpress_id', 'is', null)
            .limit(10);

        if (error) console.error('Error:', error.message);
        else console.log('Questions with ID:', data);

        const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .not('testpress_id', 'is', null);

        console.log(`Total questions with testpress_id: ${count}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkNonNullIds();
