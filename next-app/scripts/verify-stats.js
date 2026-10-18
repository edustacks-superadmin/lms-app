require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const courseId = 73;

    console.log(`Checking data for course ${courseId}...`);

    // 1. Check Chapters and Contents
    const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select(`
            id,
            name,
            chapter_contents (
                id,
                title,
                type
            )
        `)
        .eq('course_id', courseId);

    if (chaptersError) {
        console.error('Error fetching chapters:', chaptersError);
    } else {
        let videoCount = 0;
        chapters.forEach(c => {
            const vids = c.chapter_contents.filter(cc => cc.type === 'video');
            videoCount += vids.length;
            if (vids.length > 0) {
                console.log(`Chapter '${c.name}' has ${vids.length} videos.`);
            }
        });
        console.log(`Total videos found in DB query: ${videoCount}`);
    }

    // 2. Check Enrollments
    const { count: enrollmentCount, error: enrollError } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'active');

    if (enrollError) console.error('Error fetching enrollments:', enrollError);
    else console.log(`Total active enrollments: ${enrollmentCount}`);
}

checkData();
