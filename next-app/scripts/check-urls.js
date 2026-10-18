require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVideoUrls() {
    console.log('Checking video URLs...');

    const { data: videos, error } = await supabase
        .from('chapter_contents')
        .select('*')
        .eq('type', 'video')
        .limit(1);

    if (error) {
        console.error('Error fetching videos:', error);
    } else {
        if (videos.length > 0) {
            console.log('Keys in chapter_contents row:', Object.keys(videos[0]));
        }
        let ytCount = 0;
        let otherCount = 0;
        videos.forEach(v => {
            if (v.url && (v.url.includes('youtube') || v.url.includes('youtu.be'))) {
                ytCount++;
                console.log(`[YT] ${v.title}: ${v.url}`);
            } else {
                otherCount++;
                console.log(`[OTHER] ${v.title}: ${v.url}`);
            }
        });
        console.log(`Found ${ytCount} YouTube links and ${otherCount} other links.`);
    }
}

checkVideoUrls();
