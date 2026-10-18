const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    // Trick: asking for CSV format returns headers even if 0 rows
    const { data, error } = await supabase.from('exam_applications').select('*').limit(0).csv();
    if (data) {
        console.log('Columns from exam_applications:', data.trim());
    } else {
        console.log('Error fetching exam_applications columns:', error);
    }

    const { data: data2 } = await supabase.from('external_exam_results').select('*').limit(0).csv();
    if (data2) {
        console.log('Columns from external_exam_results:', data2.trim());
    }
}

checkColumns();
