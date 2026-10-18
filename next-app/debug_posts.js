const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugPosts() {
    console.log('Checking posts table...\n');

    // 1. Count total posts
    const { count, error: countError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

    console.log('Total posts:', count);

    // 2. Check institute_id
    const { data: institutes } = await supabase
        .from('institute_settings')
        .select('id, name')
        .limit(5);

    console.log('Institutes:', institutes?.map(i => ({ id: i.id, name: i.name })));

    // 3. Get sample posts with all relevant fields
    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, title, access_control, status, is_deleted, publication_date, institute_id')
        .limit(5);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('\nSample posts:');
    posts?.forEach(p => {
        console.log(`  - ID: ${p.id}`);
        console.log(`    Title: ${p.title?.substring(0, 40)}...`);
        console.log(`    access_control: "${p.access_control}"`);
        console.log(`    status: "${p.status}"`);
        console.log(`    is_deleted: ${p.is_deleted}`);
        console.log(`    publication_date: ${p.publication_date}`);
        console.log(`    institute_id: ${p.institute_id}`);
        console.log('');
    });

    // 4. Count posts matching public criteria
    const now = new Date().toISOString();
    const { count: publicCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('access_control', 'Public')
        .eq('is_deleted', false)
        .eq('status', 'published')
        .lte('publication_date', now);

    console.log(`Posts matching public criteria: ${publicCount}`);
}

debugPosts();
