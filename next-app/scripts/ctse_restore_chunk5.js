require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const chunk5 = require('./ctse_data_chunk5'); // Reuse the existing file

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreChunk5() {
    console.log(`🔄 Restoring Chunk 5 (${chunk5.length} posts)...`);

    // Fetch
    const { data: config } = await supabase
        .from('exam_configurations')
        .select('*')
        .eq('exam_tag', 'TNPSC_CTSE_DIP_ITI_2025')
        .single();

    if (!config) return console.error('❌ Config not found');

    const currentPosts = config.vacancies.posts || [];

    // Filter out if they already exist
    const uniqueRestores = chunk5.filter(mp => !currentPosts.some(cp => cp.code === mp.code));

    if (uniqueRestores.length === 0) {
        console.log('⚠️ All chunk 5 posts already present?');
        return;
    }

    const updatedPosts = [...currentPosts, ...uniqueRestores];

    const { error } = await supabase
        .from('exam_configurations')
        .update({ vacancies: { ...config.vacancies, posts: updatedPosts } })
        .eq('id', config.id);

    if (error) console.error('❌ Update failed', error);
    else console.log(`✅ Success! Restored ${uniqueRestores.length} posts. Total now: ${updatedPosts.length}`);
}

restoreChunk5();
