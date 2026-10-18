const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkId1() {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('id, question_text')
            .eq('id', 1)
            .single();

        if (error) console.error('Error:', error.message);
        else {
            console.log(`ID: ${data.id}`);
            console.log(`Text: ${data.question_text.substring(0, 100)}`);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkId1();
