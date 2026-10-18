const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkExamsIdType() {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('id')
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            console.log('Sample exam ID:', data[0].id);
            console.log('Type of ID:', typeof data[0].id);
        } else {
            console.log('Table empty');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkExamsIdType();
