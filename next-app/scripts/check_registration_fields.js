const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFields() {
    // Check columns
    const { data: columns, error: colError } = await supabase
        .from('information_schema.columns') // This might not work with postgrest if not exposed
        .select('column_name') // This is usually blocked

    // Alternative: Try to just select * from registration_fields limit 1 and print keys if data exists?
    // Or just try to get the error from a failed insert more clearly.

    const { data, error } = await supabase
        .from('registration_fields')
        .select('*');

    if (error) {
        console.error('Error fetching fields:', error);
    } else {
        console.log('Existing fields count:', data.length);
        if (data.length > 0) {
            console.log('Sample field keys:', Object.keys(data[0]));
            // Check if placeholder exists
            console.log('First record:', data[0]);
        } else {
            console.log('No fields found. Can verify schema?');
        }
    }
}

checkFields();
