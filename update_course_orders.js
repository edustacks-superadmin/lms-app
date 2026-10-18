import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';
const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

async function updateCourseOrders() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   UPDATING COURSE ORDERS FROM TESTPRESS    ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Fetch all courses from Testpress with pagination
    let allCourses = [];
    let currentUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/courses/`;
    let pageNum = 1;

    while (currentUrl) {
        console.log(`📄 Fetching courses page ${pageNum}...`);
        const coursesData = await fetchFromTestpress(currentUrl, TESTPRESS_TOKEN);

        if (!coursesData || !coursesData.results) break;

        console.log(`   ✅ Got ${coursesData.results.length} courses`);
        allCourses = allCourses.concat(coursesData.results);

        currentUrl = coursesData.next;
        pageNum++;

        if (currentUrl) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    console.log(`\n📚 Total Testpress courses: ${allCourses.length}\n`);

    // Get all LMS courses
    const { data: lmsCourses, error } = await supabase
        .from('courses')
        .select('id, title');

    if (error) {
        console.error('❌ Error fetching LMS courses:', error.message);
        return;
    }

    console.log(`📖 LMS courses: ${lmsCourses.length}\n`);

    let updated = 0;
    let notFound = 0;

    for (const lmsCourse of lmsCourses) {
        const tpCourse = allCourses.find(tp => tp.title === lmsCourse.title);

        if (!tpCourse) {
            console.log(`⚠️  ${lmsCourse.title} - not found in Testpress`);
            notFound++;
            continue;
        }

        const order = tpCourse.order !== undefined ? tpCourse.order : 999;

        const { error: updateError } = await supabase
            .from('courses')
            .update({ order })
            .eq('id', lmsCourse.id);

        if (updateError) {
            console.error(`❌ Error updating ${lmsCourse.title}:`, updateError.message);
        } else {
            console.log(`✅ ${lmsCourse.title} - order: ${order}`);
            updated++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('╔════════════════════════════════════════════╗');
    console.log('║              UPDATE SUMMARY                ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\n✅ Updated: ${updated} courses`);
    console.log(`⚠️  Not found: ${notFound} courses\n`);
}

updateCourseOrders();
