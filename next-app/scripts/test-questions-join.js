const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testJoin() {
    console.log('Testing Join Query...');
    const { data, error } = await supabase
        .from('questions')
        .select(`
            id,
            question_text,
            question_options (*),
            question_tags (*)
        `)
        .limit(1);

    if (error) {
        console.error('Join failed:', error);
    } else {
        console.log('Join successful!');
        console.log(JSON.stringify(data, null, 2));
    }
}

testJoin();
