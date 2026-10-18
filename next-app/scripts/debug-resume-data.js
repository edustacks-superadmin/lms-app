const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

// Helper to ensure we have keys
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('CRITICAL: Missing Supabase Env Vars in .env.local');
    // Fallback to trying .env
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded' : 'Missing');
console.log('KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : 'Missing');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugResumeData() {
    console.log('--- Debugging Resume Data Fetch ---');

    // 1. Get a test member (Using specific email if known, or just first one)
    // We try to find a member with some progress to make the test useful
    const { data: memberProgress, error: memberError } = await supabase
        .from('content_progress')
        .select('member_id')
        .limit(1);

    if (memberError || !memberProgress.length) {
        console.error('Error fetching any progress to test:', memberError);
        return;
    }

    const memberId = memberProgress[0].member_id;
    console.log(`Using Member ID: ${memberId}`);

    // 2. Run the Dashboard Query EXACTLY
    console.log('Running dashboard query...');
    const { data: recentProgress, error: progressError } = await supabase
        .from('content_progress')
        .select('updated_at, content_id, chapter_contents(id, title, type, chapters(courses(id, title, image)))')
        .eq('member_id', memberId)
        .order('updated_at', { ascending: false })
        .limit(10);

    if (progressError) {
        console.error('Fetch Error:', progressError);
        return;
    }

    console.log(`Found ${recentProgress.length} items.`);

    // 3. Log the Raw Structure
    recentProgress.forEach((item, index) => {
        console.log(`\n[Item ${index}]`);
        console.log('  updated_at:', item.updated_at);
        console.log('  content_id (Direct):', item.content_id);

        const content = item.chapter_contents;

        if (content) {
            console.log('  chapter_contents (Joined): OBJECT');
            console.log('    id:', content.id);
            console.log('    title:', content.title);
            console.log('    type:', content.type);
            console.log('    course:', content.chapters?.courses?.title || 'N/A');
        } else {
            console.log('  chapter_contents (Joined): NULL (Content might be deleted)');
        }

        // Logic Check
        const safeId = content?.id || item.content_id;
        console.log(`  => Resolved Safe ID: ${safeId}`);
        console.log(`  => Valid for Resume? ${content && (content.type === 'video' || content.type === 'pdf') && safeId ? 'YES' : 'NO'}`);
    });

    console.log('\n--- End Debug ---');
}

debugResumeData();
