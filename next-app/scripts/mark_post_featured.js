const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function markPostFeatured(postId) {
    console.log(`Marking post ${postId} as featured...`);

    const { data, error } = await supabase
        .from('posts')
        .update({ is_featured: true })
        .eq('id', postId)
        .select();

    if (error) {
        console.error('Error updating post:', error);
        return;
    }

    console.log('Successfully marked post as featured:', data[0].title);
}

// Mark ID 28 as featured (based on previous check)
markPostFeatured(28);
