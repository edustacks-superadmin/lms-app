
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function truncateSummary(text, maxLength = 157) {
    if (!text) return '';
    if (text.length <= 160) return text;

    // Remove HTML tags if any
    let cleaned = text.replace(/<[^>]*>/g, '');

    // Initial cut
    let truncated = cleaned.substr(0, maxLength);

    // Re-trim if we are in the middle of a word
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
        truncated = truncated.substr(0, lastSpace);
    }

    // Add ellipsis
    return truncated + '...';
}

async function fixSummaries() {
    console.log('Fetching posts...');

    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, title, summary, description');

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    let updatedCount = 0;

    for (const post of posts) {
        const original = post.summary || post.description || '';

        if (original.length > 160) {
            const newSummary = truncateSummary(original);

            console.log(`Updating Post [${post.id}]:`);
            console.log(`  OLD (${original.length}): ${original.substr(0, 50)}...`);
            console.log(`  NEW (${newSummary.length}): ${newSummary}`);

            const { error: updateError } = await supabase
                .from('posts')
                .update({ summary: newSummary })
                .eq('id', post.id);

            if (updateError) {
                console.error(`  Also failed to update ${post.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} posts.`);
}

fixSummaries();
