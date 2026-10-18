require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const targets = ["3115", "3547", "3651"];

async function checkSpecific() {
    console.log(`🔍 Checking for posts: ${targets.join(', ')}`);

    const { data: config } = await supabase
        .from('exam_configurations')
        .select('vacancies')
        .eq('exam_tag', 'TNPSC_CTSE_DIP_ITI_2025')
        .single();

    if (!config) return console.error('❌ Config not found');

    const posts = config.vacancies?.posts || [];

    targets.forEach(code => {
        const found = posts.find(p => p.code === code);
        if (found) {
            console.log(`✅ Found ${code}: ${found.post_name}`);
        } else {
            console.log(`❌ MISSING ${code}`);
        }
    });
}

checkSpecific();
