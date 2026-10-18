const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function backfillInstituteIds() {
    console.log('Checking for records with missing institute_id...');

    // First, verify how many needs update
    const { count, error: countError } = await supabase
        .from('external_exam_results')
        .select('*', { count: 'exact', head: true })
        .is('institute_id', null);

    if (countError) {
        console.error('Error counting records:', countError);
        return;
    }

    console.log(`Found ${count} records with NULL institute_id.`);

    if (count === 0) {
        console.log('No backfill needed.');
        return;
    }

    // Perform Update
    console.log('Updating records to use default institute_id: 10...');
    const { error: updateError } = await supabase
        .from('external_exam_results')
        .update({ institute_id: 10 })
        .is('institute_id', null);

    if (updateError) {
        console.error('Update failed:', updateError);
    } else {
        console.log('Successfully backfilled institute_id for all records.');
    }
}

backfillInstituteIds();
