require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('🔍 Checking Vacancies for Civil AE Group (3270)...');

    const { data: configs } = await supabase
        .from('exam_configurations')
        .select('*')
        .ilike('exam_tag', '%TNPSC%');

    if (!configs || configs.length === 0) {
        console.log('❌ No configs found.');
        return;
    }

    const config = configs.find(c => c.vacancies?.posts || c.vacancies?.groups) || configs[0];
    const vacancies = config.vacancies || {};

    // Check specific post 3270 or group
    const groupMatches = vacancies.groups?.filter(g => g.post_codes.includes('3270'));
    const postMatches = vacancies.posts?.filter(p => p.code === '3270');

    if (groupMatches?.length > 0) {
        console.log('✅ Found Group Match:', JSON.stringify(groupMatches[0], null, 2));
    } else if (postMatches?.length > 0) {
        console.log('✅ Found Post Match:', JSON.stringify(postMatches[0], null, 2));
    } else {
        console.log('❌ No vacancy data found for Post 3270.');
        console.log('Available Groups:', vacancies.groups?.map(g => g.name));
        console.log('Available Posts:', vacancies.posts?.map(p => p.code));
    }
}

check();
