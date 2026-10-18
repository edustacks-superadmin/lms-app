require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIntegrity() {
    console.log('🔍 Checking Post Library vs Groups Integrity...');

    const { data: config, error } = await supabase
        .from('exam_configurations')
        .select('vacancies')
        .eq('exam_tag', 'TNPSC_CTSE_DIP_ITI_2025')
        .single();

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    const posts = config.vacancies?.posts || [];
    const groups = config.vacancies?.groups || [];

    console.log(`📚 Total Posts in Library: ${posts.length}`);
    console.log(`Groups: ${groups.length}`);

    // Check Electrician Group specificially
    const elecGroup = groups.find(g => g.name.includes('Electrician'));
    if (elecGroup) {
        console.log(`\n⚡ Checking Group: ${elecGroup.name}`);
        console.log(`   Expected Codes (${elecGroup.post_codes.length}):`, elecGroup.post_codes.join(', '));

        const found = [];
        const missing = [];

        elecGroup.post_codes.forEach(code => {
            const post = posts.find(p => p.code === code);
            if (post) found.push(code);
            else missing.push(code);
        });

        console.log(`   ✅ Found (${found.length}):`, found.join(', '));
        console.log(`   ❌ Missing from Library (${missing.length}):`, missing.join(', '));
    }
}

checkIntegrity();
