
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanPosts() {
    console.log('🚀 Starting content cleanup migration...');

    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, title, description, summary, content');

    if (error) {
        console.error('❌ Error fetching posts:', error);
        return;
    }

    console.log(`📝 Found ${posts.length} posts to analyze.`);

    let updatedCount = 0;

    for (const post of posts) {
        let needsUpdate = false;
        const cleaned = {};

        const fields = ['title', 'description', 'summary', 'content'];
        fields.forEach(field => {
            const original = post[field] || '';
            const cleanedVal = original.replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ');

            if (original !== cleanedVal) {
                cleaned[field] = cleanedVal;
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            const { error: updateError } = await supabase
                .from('posts')
                .update(cleaned)
                .eq('id', post.id);

            if (updateError) {
                console.error(`❌ Failed to update post ${post.id}:`, updateError);
            } else {
                updatedCount++;
                console.log(`✅ Cleaned post ${post.id}: ${post.title?.substring(0, 30)}...`);
            }
        }
    }

    console.log(`🏁 Migration complete. Cleaned ${updatedCount} posts.`);
}

cleanPosts();
