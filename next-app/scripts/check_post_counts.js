
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCounts() {
    console.log('🚀 Checking post counts per category...');

    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name');

    if (catError) {
        console.error('❌ Error fetching categories:', catError);
        return;
    }

    const { data: allPosts, error: postError } = await supabase
        .from('posts')
        .select('id, category_id, is_deleted');

    if (postError) {
        console.error('❌ Error fetching posts:', postError);
        return;
    }

    console.log(`📊 Total posts in DB: ${allPosts.length}`);

    const counts = {};
    categories.forEach(cat => {
        counts[cat.id] = {
            name: cat.name,
            total: 0,
            active: 0
        };
    });

    allPosts.forEach(post => {
        if (post.category_id && counts[post.category_id]) {
            counts[post.category_id].total++;
            if (!post.is_deleted) {
                counts[post.category_id].active++;
            }
        }
    });

    console.log('---RESULT---');
    console.log(JSON.stringify(Object.values(counts), null, 2));
    console.log('---END---');
}

checkCounts();
