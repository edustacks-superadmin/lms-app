const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFeaturedPosts() {
    console.log('Checking featured status of posts...');

    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, title, is_featured, is_deleted, publication_date')
        .eq('is_deleted', false)
        .order('is_featured', { ascending: false });

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    console.log(`Found ${posts.length} active posts:`);
    console.log(JSON.stringify(posts.map(p => ({
        id: p.id,
        title: p.title.substring(0, 50),
        is_featured: p.is_featured,
        publication_date: p.publication_date
    })), null, 2));
}

checkFeaturedPosts();
