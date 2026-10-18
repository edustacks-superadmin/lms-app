const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQuestionIds() {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('id, testpress_id')
            .limit(10);

        if (error) console.error('Error:', error.message);
        else console.log('Sample Questions:', data);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkQuestionIds();
