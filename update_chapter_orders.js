import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';
const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchFromTestpress(url, token) {
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `JWT ${token}` }
        });
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${url}:`, error.message);
        return null;
    }
}

async function updateChapterOrders() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   UPDATING CHAPTER ORDERS FROM TESTPRESS   ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // 1. Fetch all courses from Testpress to get their IDs
    console.log('📚 Step 1: Fetching all courses from Testpress...\n');
    let allTpCourses = [];
    let currentUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/courses/`;
    let pageNum = 1;

    while (currentUrl) {
        console.log(`   📄 Fetching courses page ${pageNum}...`);
        const coursesData = await fetchFromTestpress(currentUrl, TESTPRESS_TOKEN);

        if (!coursesData || !coursesData.results) break;

        allTpCourses = allTpCourses.concat(coursesData.results);
        currentUrl = coursesData.next;
        pageNum++;

        if (currentUrl) await delay(200);
    }
    console.log(`   ✅ Found ${allTpCourses.length} Testpress courses\n`);

    // 2. Get all LMS courses
    const { data: lmsCourses, error } = await supabase
        .from('courses')
        .select('id, title');

    if (error) {
        console.error('❌ Error fetching LMS courses:', error.message);
        return;
    }

    let totalUpdated = 0;
    let totalErrors = 0;

    // 3. Iterate through courses and update chapter orders
    for (const lmsCourse of lmsCourses) {
        const tpCourse = allTpCourses.find(tp => tp.title === lmsCourse.title);

        if (!tpCourse) {
            console.log(`⚠️  Course "${lmsCourse.title}" not found in Testpress, skipping...`);
            continue;
        }

        console.log(`\n📘 Processing Course: ${lmsCourse.title} (TP ID: ${tpCourse.id})`);

        // Fetch chapters for this course from Testpress
        let allChapters = [];
        let chaptersUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/courses/${tpCourse.id}/chapters/`;

        while (chaptersUrl) {
            const chaptersData = await fetchFromTestpress(chaptersUrl, TESTPRESS_TOKEN);
            if (!chaptersData || !chaptersData.results) break;

            allChapters = allChapters.concat(chaptersData.results);
            chaptersUrl = chaptersData.next;
            if (chaptersUrl) await delay(100);
        }

        if (allChapters.length === 0) {
            console.log(`   ⚠️  No chapters found for this course`);
            continue;
        }

        console.log(`   ✅ Found ${allChapters.length} chapters in Testpress`);

        // Update orders in Supabase
        for (const tpChapter of allChapters) {
            const chapterTitle = tpChapter.name || tpChapter.title;
            const order = tpChapter.order !== undefined ? tpChapter.order : 999;

            // We update by matching course_id and title
            const { error: updateError } = await supabase
                .from('chapters')
                .update({ order: order })
                .eq('course_id', lmsCourse.id)
                .eq('title', chapterTitle);

            if (updateError) {
                // console.error(`      ❌ Error updating chapter "${chapterTitle}":`, updateError.message);
                totalErrors++;
            } else {
                // console.log(`      ✅ Updated "${chapterTitle}" order to ${order}`);
                totalUpdated++;
            }
        }
        console.log(`   ✨ Updated orders for ${allChapters.length} chapters`);

        // Small delay to avoid rate limits
        await delay(300);
    }

    console.log('\n' + '='.repeat(60));
    console.log('╔════════════════════════════════════════════╗');
    console.log('║           CHAPTER UPDATE SUMMARY           ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\n✅ Total chapters updated: ${totalUpdated}`);
    console.log(`❌ Errors: ${totalErrors}\n`);
}

updateChapterOrders();
