const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyContent() {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('question_text')
            .limit(1);

        if (error) throw error;

        console.log('Question Text:', data && data.length > 0 ? data[0].question_text.substring(0, 100) : 'No data');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyContent();
