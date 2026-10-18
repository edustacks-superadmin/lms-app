const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSimpleGetExam(id) {
    try {
        console.log('Testing simple select for ID:', id);
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching exam:', error.message);
        } else {
            console.log('Exam found:', data.title);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testSimpleGetExam(42);
