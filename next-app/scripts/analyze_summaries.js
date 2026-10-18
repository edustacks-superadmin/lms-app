
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeSummaries() {
    console.log('Fetching posts...');

    // Fetch all posts (id, title, summary, description)
    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, title, summary, description');

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    let good = 0;
    let tooLong = 0;
    let missing = 0;

    console.log(`Analyzing ${posts.length} posts...`);

    posts.forEach(post => {
        const summary = post.summary || post.description || '';
        if (!summary) {
            missing++;
        } else if (summary.length > 160) {
            tooLong++;
            // console.log(`[LONG] ${post.id} - ${post.title}: ${summary.length} chars`);
        } else {
            good++;
        }
    });

    console.log('\n--- Summary Analysis ---');
    console.log(`Total Posts: ${posts.length}`);
    console.log(`✅ Good (< 160 chars): ${good}`);
    console.log(`⚠️  Too Long (> 160 chars): ${tooLong}`);
    console.log(`❌ Missing: ${missing}`);
}

analyzeSummaries();
