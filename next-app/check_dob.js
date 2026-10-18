hatsapp
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkMemberDOB(regNo) {
    console.log(`Checking data for Registration Number: ${regNo}`);

    // 1. Get member_id from external_exam_results
    const { data: results, error: resError } = await supabaseAdmin
        .from('external_exam_results')
        .select('member_id, id, exam_tag, post_selected')
        .eq('registration_number', regNo);

    if (resError) {
        console.error('Error fetching results:', resError);
        return;
    }

    if (!results || results.length === 0) {
        console.log('No results found for this registration number.');
        return;
    }

    console.log('Found Results:', results);

    const memberIds = [...new Set(results.map(r => r.member_id).filter(Boolean))];

    if (memberIds.length === 0) {
        console.log('No linked member_id found in results.');
        return;
    }

    // 2. data from members table
    const { data: members, error: memError } = await supabaseAdmin
        .from('members')
        .select('id, display_name, email, phone_number, birth_date')
        .in('id', memberIds);

    if (memError) {
        console.error('Error fetching members:', memError);
        return;
    }

    console.log('Member Details:', members);
}

checkMemberDOB('0501009055');
