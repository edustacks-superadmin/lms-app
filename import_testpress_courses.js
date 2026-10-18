import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ==========================================
// CONFIGURATION
// ==========================================

const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchFromTestpress(endpoint, token) {
    // If endpoint is a full URL, use it directly
    if (endpoint.startsWith('http')) {
        console.log(`Fetching: ${endpoint}...`);
        try {
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `JWT ${token}` }
            });
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error.message);
            return null;
        }
    }

    // Try different API versions
    const versions = ['v2.5', 'v2.4', 'v2.3', 'v2.2'];
    const baseEndpoint = endpoint.replace(/^\/api\/v\d+\.\d+\//, '/');

    for (const v of versions) {
        const url = `${TESTPRESS_BASE_URL.replace(/\/$/, '')}/api/${v}${baseEndpoint}`;
        console.log(`Trying: ${url}...`);

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `JWT ${token}` }
            });

            if (response.ok) {
                console.log(`✅ Success with API version ${v}`);
                return await response.json();
            }
        } catch (error) {
            console.error(`Error with ${url}:`, error.message);
        }
    }

    console.error(`Failed to fetch ${endpoint} from any API version`);
    return null;
}

async function migrateCourses(token) {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   MIGRATING ALL COURSES FROM TESTPRESS     ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Use admin endpoint to get ALL courses
    const endpoints = [
        '/admin/courses/',
        '/admin/products/',
        '/courses/',
        '/products/',
    ];

    let data = null;
    let usedEndpoint = '';

    for (const endpoint of endpoints) {
        console.log(`\nTrying endpoint: ${endpoint}`);
        data = await fetchFromTestpress(endpoint, token);

        if (data && (data.results || data.courses || data.products)) {
            usedEndpoint = endpoint;
            console.log(`✅ Found courses at: ${endpoint}`);
            break;
        }
    }

    if (!data) {
        console.error('❌ Could not find courses endpoint. Possible endpoints:');
        endpoints.forEach(ep => console.log(`   - ${ep}`));
        console.log('\nPlease check your Testpress dashboard to find the correct API endpoint.');
        return;
    }

    // Save raw response for inspection
    fs.writeFileSync('debug_courses_first_page.json', JSON.stringify(data, null, 2));
    console.log('✅ Saved first page response to debug_courses_first_page.json');

    // Fetch ALL courses with pagination
    let allCourses = [];
    let currentUrl = data.next || null;
    let pageNum = 1;

    // Add courses from first page
    const firstPageCourses = data.results || data.courses || data.products || [];
    allCourses = allCourses.concat(firstPageCourses);
    console.log(`📄 Page ${pageNum}: Got ${firstPageCourses.length} courses`);

    // Fetch remaining pages
    while (currentUrl) {
        pageNum++;
        console.log(`📄 Fetching page ${pageNum}...`);

        const pageData = await fetchFromTestpress(currentUrl, token);

        if (!pageData || !(pageData.results || pageData.courses || pageData.products)) {
            console.log(`   ⚠️ No more data on page ${pageNum}`);
            break;
        }

        const pageCourses = pageData.results || pageData.courses || pageData.products || [];
        console.log(`   ✅ Got ${pageCourses.length} courses from page ${pageNum}`);
        allCourses = allCourses.concat(pageCourses);

        currentUrl = pageData.next;

        // Small delay to avoid rate limiting
        if (currentUrl) {
            await delay(300);
        }
    }

    if (allCourses.length === 0) {
        console.log('⚠️ No courses found in the response');
        return;
    }

    console.log(`\n📚 Total courses found: ${allCourses.length}\n`);
    console.log('='.repeat(60));

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < allCourses.length; i++) {
        const tpCourse = allCourses[i];
        try {
            console.log(`\n[${i + 1}/${allCourses.length}] Processing: ${tpCourse.title || tpCourse.name || 'Unnamed Course'}`);

            // Map Testpress course to LMS course structure
            const courseData = {
                title: tpCourse.title || tpCourse.name || 'Untitled Course',
                description: tpCourse.description || 'Imported from Testpress',
                image: tpCourse.image || null,
                order: tpCourse.order !== undefined ? tpCourse.order : i,
            };

            // Check if course already exists
            const { data: existing } = await supabase
                .from('courses')
                .select('id, title')
                .eq('title', courseData.title)
                .single();

            if (existing) {
                console.log(`   ⏭️ Skipped (already exists): ${existing.title}`);
                skipped++;
                continue;
            }

            // Insert course
            const { data: course, error } = await supabase
                .from('courses')
                .insert(courseData)
                .select()
                .single();

            if (error) {
                console.error(`   ❌ Error importing course:`, error.message);
                errors++;
            } else {
                console.log(`   ✅ Imported: ${course.title} (ID: ${course.id})`);
                imported++;
            }

            // Add small delay to avoid overwhelming the database
            if (i < allCourses.length - 1) {
                await delay(200);
            }

        } catch (error) {
            console.error(`   ❌ Exception:`, error.message);
            errors++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('╔════════════════════════════════════════════╗');
    console.log('║           MIGRATION SUMMARY                ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\n✅ Successfully imported: ${imported} courses`);
    console.log(`⏭️  Skipped (duplicates):  ${skipped} courses`);
    console.log(`❌ Errors:                ${errors} courses`);
    console.log(`📊 Total processed:       ${imported + skipped + errors} courses\n`);
}

async function runCourseMigration() {
    console.log('Starting FULL course migration from Testpress...\n');
    await migrateCourses(TESTPRESS_TOKEN);
    console.log('\n✨ Course migration complete!\n');
}

runCourseMigration();
