require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const missingPosts = require('./ctse_missing_electrician');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function appendMissing() {
    console.log('🔄 Appending 7 missing Electrician posts...');

    // Fetch
    const { data: config } = await supabase
        .from('exam_configurations')
        .select('*')
        .eq('exam_tag', 'TNPSC_CTSE_DIP_ITI_2025')
        .single();

    if (!config) return console.error('❌ Config not found');

    const currentPosts = config.vacancies.posts || [];

    // Filter out if they already exist to avoid dupes
    const uniqueMissing = missingPosts.filter(mp => !currentPosts.some(cp => cp.code === mp.code));

    if (uniqueMissing.length === 0) {
        console.log('⚠️ All missing posts already present? Strange.');
        return;
    }

    const updatedPosts = [...currentPosts, ...uniqueMissing];

    const { error } = await supabase
        .from('exam_configurations')
        .update({ vacancies: { ...config.vacancies, posts: updatedPosts } })
        .eq('id', config.id);

    if (error) console.error('❌ Update failed', error);
    else console.log(`✅ Success! Added ${uniqueMissing.length} posts. Total now: ${updatedPosts.length}`);
}

appendMissing();
