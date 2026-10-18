
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'external_exam_results' });

    // If RPC isn't available, we can try to fetch from information_schema via a trick or just use the JS client's error message if we fail an insert.
    // But actually, we can just try to fetch 1 row again and if it's empty, Object.keys will be empty.
    // Let's try a direct query to information_schema if possible (Supabase allows this in some configs, otherwise not).

    const { data: cols, error: colError } = await supabase
        .from('external_exam_results')
        .select('*')
        .limit(1);

    if (cols && cols.length > 0) {
        console.log('Columns:', Object.keys(cols[0]));
    } else {
        console.log('Table is empty, trying to infer from error...');
        // Try to insert an empty object to get a list of missing required columns
        const { error: insertError } = await supabase
            .from('external_exam_results')
            .insert([{}]);
        console.log('Insert Error hints:', insertError);
    }
}

checkSchema();
