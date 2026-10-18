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

async function fetchFromTestpress(url, token) {
    // console.log(`Fetching: ${url}...`);
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

async function migrateChapters(token) {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   MIGRATING CHAPTERS WITH HIERARCHY        ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // 1. Fetch all courses from Testpress
    console.log('📚 Step 1: Fetching all courses from Testpress...\n');

    let allCourses = [];
    let currentUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/courses/`;
    let pageNum = 1;

    while (currentUrl) {
        console.log(`📄 Fetching courses page ${pageNum}...`);
        const coursesData = await fetchFromTestpress(currentUrl, token);

        if (!coursesData || !coursesData.results) break;

        allCourses = allCourses.concat(coursesData.results);
        currentUrl = coursesData.next;
        pageNum++;
        if (currentUrl) await delay(200);
    }

    console.log(`\n📚 Total Testpress courses found: ${allCourses.length}\n`);

    // 2. Get all LMS courses
    const { data: lmsCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title');

    if (coursesError) {
        console.error('❌ Error fetching LMS courses:', coursesError.message);
        return;
    }

    let totalImported = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const lmsCourse of lmsCourses) {
        const tpCourse = allCourses.find(tp => tp.title === lmsCourse.title);

        if (!tpCourse) {
            console.log(`⚠️  Skipping "${lmsCourse.title}" (not found in Testpress)`);
            continue;
        }

        console.log(`\n📘 Processing: ${lmsCourse.title} (TP ID: ${tpCourse.id})`);

        // Fetch ALL chapters for this course
        let allChapters = [];
        let chaptersUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/courses/${tpCourse.id}/chapters/`;

        while (chaptersUrl) {
            const chaptersData = await fetchFromTestpress(chaptersUrl, token);
            if (!chaptersData || !chaptersData.results) break;

            allChapters = allChapters.concat(chaptersData.results);
            chaptersUrl = chaptersData.next;
            if (chaptersUrl) await delay(100);
        }

        if (allChapters.length === 0) {
            console.log(`   ⚠️  No chapters found`);
            continue;
        }

        console.log(`   ✅ Found ${allChapters.length} chapters. Syncing...`);

        // --- PASS 1: Insert/Update all chapters (without parent_id) ---
        for (const tpChapter of allChapters) {
            const chapterTitle = tpChapter.name || tpChapter.title || 'Untitled Chapter';
            const order = tpChapter.order !== undefined ? tpChapter.order : 999;

            // Extract parent TP ID if exists
            let parentTpId = null;
            if (tpChapter.parent_url) {
                // parent_url example: ".../courses/1837/" -> extract 1837
                // Note: The URL says "courses" but it's actually pointing to a chapter ID in this context
                // based on the debug file: "parent_url": ".../admin/courses/1837/"
                const match = tpChapter.parent_url.match(/\/courses\/(\d+)\//);
                if (match && match[1]) {
                    parentTpId = parseInt(match[1]);
                }
            }

            // Prepare data
            const chapterData = {
                course_id: lmsCourse.id,
                title: chapterTitle,
                description: tpChapter.description || '',
                order: order,
                image: tpChapter.image || tpChapter.icon || null,
                testpress_id: tpChapter.id,
                // We DO NOT set parent_id yet
            };

            // Upsert based on testpress_id if possible, or title+course_id
            // Ideally we should use testpress_id as unique key if we have it populated
            // But for now let's try to match by testpress_id first

            let { data: existing } = await supabase
                .from('chapters')
                .select('id')
                .eq('testpress_id', tpChapter.id)
                .single();

            if (!existing) {
                // Fallback: match by title and course_id (legacy)
                const { data: legacyMatch } = await supabase
                    .from('chapters')
                    .select('id')
                    .eq('course_id', lmsCourse.id)
                    .eq('title', chapterTitle)
                    .single();
                existing = legacyMatch;
            }

            if (existing) {
                // Update
                const { error } = await supabase
                    .from('chapters')
                    .update(chapterData)
                    .eq('id', existing.id);

                if (error) {
                    console.error(`      ❌ Error updating "${chapterTitle}":`, error.message);
                    totalErrors++;
                } else {
                    totalUpdated++;
                }
            } else {
                // Insert
                const { error } = await supabase
                    .from('chapters')
                    .insert(chapterData);

                if (error) {
                    console.error(`      ❌ Error inserting "${chapterTitle}":`, error.message);
                    totalErrors++;
                } else {
                    totalImported++;
                }
            }
        }

        // --- PASS 2: Link Parents ---
        // Now that all chapters exist, we can link them
        let linkedCount = 0;
        for (const tpChapter of allChapters) {
            if (!tpChapter.parent_url) continue;

            const match = tpChapter.parent_url.match(/\/courses\/(\d+)\//);
            if (!match || !match[1]) continue;

            const parentTpId = parseInt(match[1]);

            // Find the Supabase ID of the parent chapter
            const { data: parentChapter } = await supabase
                .from('chapters')
                .select('id')
                .eq('testpress_id', parentTpId)
                .single();

            if (parentChapter) {
                // Update the current chapter with parent_id
                const { error } = await supabase
                    .from('chapters')
                    .update({ parent_id: parentChapter.id })
                    .eq('testpress_id', tpChapter.id);

                if (error) {
                    console.error(`      ❌ Error linking parent for "${tpChapter.name}":`, error.message);
                } else {
                    linkedCount++;
                }
            } else {
                console.warn(`      ⚠️  Parent chapter (TP ID: ${parentTpId}) not found for "${tpChapter.name}"`);
            }
        }

        if (linkedCount > 0) {
            console.log(`      🔗 Linked ${linkedCount} sub-chapters to their parents`);
        }

        // Small delay
        await delay(200);
    }

    console.log('\n' + '='.repeat(60));
    console.log('╔════════════════════════════════════════════╗');
    console.log('║           MIGRATION SUMMARY                ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\n✅ Imported: ${totalImported}`);
    console.log(`🔄 Updated:  ${totalUpdated}`);
    console.log(`❌ Errors:   ${totalErrors}\n`);
}

migrateChapters(TESTPRESS_TOKEN);
