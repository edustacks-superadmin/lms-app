const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './next-app/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkInstitutes() {
    console.log('Checking institute_settings...');

    // Check 'demo' slug
    const { data: demoData, error: demoError } = await supabaseAdmin
        .from('institute_settings')
        .select('slug, name')
        .eq('slug', 'demo')
        .single();

    if (demoError) console.error('Error fetching demo:', demoError);
    else console.log('Demo tenant:', demoData);

    // Check 'maheshiesacademy' slug
    const { data: targetData, error: targetError } = await supabaseAdmin
        .from('institute_settings')
        .select('slug, name')
        .eq('slug', 'maheshiesacademy')
        .single();

    if (targetError) {
        console.error('Error fetching maheshiesacademy:', targetError);
        // Try searching by name if slug failed
        const { data: searchData, error: searchError } = await supabaseAdmin
            .from('institute_settings')
            .select('slug, name')
            .ilike('slug', '%mahesh%');

        if (searchData) {
            console.log('Found institutes with "mahesh" in slug:', searchData);
        }
    }
    else console.log('Target tenant:', targetData);
}

checkInstitutes();
