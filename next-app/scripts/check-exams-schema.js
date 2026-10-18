const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkExamsSchema() {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .limit(1);

        if (error) throw error;

        console.log('Exams Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'Table empty');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkExamsSchema();
