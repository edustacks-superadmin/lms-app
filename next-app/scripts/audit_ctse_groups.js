require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllGroups() {
    console.log('🔍 Auditing ALL CTSE Groups...');

    // Fetch config
    const { data: config } = await supabase
        .from('exam_configurations')
        .select('vacancies')
        .eq('exam_tag', 'TNPSC_CTSE_DIP_ITI_2025')
        .single();

    if (!config) return console.error('❌ Config not found');

    const posts = config.vacancies?.posts || [];
    const groups = config.vacancies?.groups || [];
    const allMissing = [];

    console.log(`📚 Total Posts in Library: ${posts.length}`);

    groups.forEach(group => {
        const missing = group.post_codes.filter(code => !posts.find(p => p.code === code));

        if (missing.length > 0) {
            console.log(`❌ [${group.name}] is missing ${missing.length} posts: ${missing.join(', ')}`);
            allMissing.push(...missing);
        } else {
            console.log(`✅ [${group.name}] is complete.`);
        }
    });

    console.log(`\n🚨 TOTAL MISSING POSTS TO BACKFILL: ${allMissing.length}`);
    console.log(JSON.stringify(allMissing));
}

checkAllGroups();
