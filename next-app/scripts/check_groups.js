require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGroups() {
    console.log('🔍 Checking CTSE Groups in DB...');

    const { data: config, error } = await supabase
        .from('exam_configurations')
        .select('vacancies')
        .eq('exam_tag', 'TNPSC_CTSE_DIP_ITI_2025')
        .single();

    if (error) {
        console.error('❌ Error fetching config:', error);
        return;
    }

    const groups = config.vacancies?.groups || [];
    console.log(`✅ Groups Found: ${groups.length}`);
    groups.forEach((g, i) => {
        console.log(`${i + 1}. ${g.name} (Code: ${g.code}) - ${g.post_codes?.length || 0} posts`);
    });
}

checkGroups();
