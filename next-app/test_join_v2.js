const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testJoin() {
    console.log('Testing categories relationship name...');

    const now = new Date().toISOString();

    // 1. Just fetch posts to make sure they exist
    const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, category_id')
        .eq('is_deleted', false)
        .lte('publication_date', now)
        .limit(5);

    console.log('Posts exist check:', posts?.length, postsError?.message || 'No error');
    if (posts) console.log('Sample category_ids:', posts.map(p => p.category_id));

    // 2. Try with 'categories'
    console.log('\nTrying join with "categories":');
    const { data: data1, error: error1 } = await supabase
        .from('posts')
        .select('id, title, categories(name, color)')
        .eq('is_deleted', false)
        .lte('publication_date', now)
        .limit(1);

    if (error1) {
        console.log('Error with "categories":', error1.message, error1.details, error1.hint);
    } else {
        console.log('Success with "categories":', JSON.stringify(data1, null, 2));
    }
}

testJoin();
