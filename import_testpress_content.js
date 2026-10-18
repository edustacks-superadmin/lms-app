require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase  Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Testpress Configuration
const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6Im1haGVzaDIyIiwidXNlcl9pZCI6MTQxMDksInByb2R1Y3QiOiJ0aGFwb3Zhbmluc3RpdHV0ZSIsImVtYWlsIjoibWFoZXNoMjJAZ21haWwuY29tIiwiZXhwIjoxNzY2MTcwNDk5LCJvcmlnX2lhdCI6MTczMzYzNDQ5OX0.W-DqINJu-t3lAx9bJ94dIZNBRUk0TqCq7Yp9p9-VoO0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchFromTestpress(url, token) {
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`   ❌ Failed to fetch: ${response.status} ${response.statusText}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`   ❌ Error fetching data: ${error.message}`);
        return null;
    }
}

async function migrateContent() {
    console.log('Starting content migration from Testpress...\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const stats = {
        imported: 0,
        skipped: 0,
        errors: 0
    };

    try {
        // Read the courses data file
        const coursesData = JSON.parse(fs.readFileSync('debug_courses_response.json', 'utf8'));

        // Get existing courses from LMS that were imported from Testpress
        const { data: lmsCourses, error: coursesError } = await supabase
            .from('courses')
            .select('id, title, description')
            .ilike('description', '%Imported from Testpress%');

        if (coursesError) {
            console.error('Error fetching LMS courses:', coursesError);
            return;
        }

        if (lmsCourses.length === 0) {
            console.log('⚠️ No Testpress courses found in LMS. Run import_testpress_courses.js first.');
            return;
        }

        console.log(`Found ${lmsCourses.length} Testpress courses in LMS\n`);

        // Process each course
        for (const tpCourse of coursesData.results) {
            console.log(`\n📚 Processing Course: ${tpCourse.title}`);
            console.log(`   Course ID: ${tpCourse.id}`);
            console.log(`   Contents count: ${tpCourse.contents_count}`);

            // Find corresponding LMS course
            const lmsCourse = lmsCourses.find(c => c.title === tpCourse.title);
            if (!lmsCourse) {
                console.log(`   ⚠️ Course not found in LMS, skipping...`);
                stats.skipped += tpCourse.contents_count;
                continue;
            }

            // Get chapters for this course
            const { data: lmsChapters, error: chaptersError } = await supabase
                .from('chapters')
                .select('id, title')
                .eq('course_id', lmsCourse.id)
                .order('order');

            if (chaptersError) {
                console.error(`   ❌ Error fetching chapters:`, chaptersError);
                continue;
            }

            if (lmsChapters.length === 0) {
                console.log(`   ⚠️ No chapters found for this course, skipping...`);
                stats.skipped += tpCourse.contents_count;
                continue;
            }

            console.log(`   Found ${lmsChapters.length} chapters in LMS`);

            // Fetch contents from Testpress
            const contentsUrl = tpCourse.contents_url;
            console.log(`   Fetching from: ${contentsUrl}`);

            const contentsData = await fetchFromTestpress(contentsUrl, TESTPRESS_TOKEN);

            if (!contentsData || !contentsData.results) {
                console.log(`   ❌ Failed to fetch contents`);
                stats.errors += tpCourse.contents_count;
                continue;
            }

            // Save debug file
            const debugFileName = `debug_contents_${tpCourse.title.replace(/[^a-z0-9]/gi, '_')}.json`;
            fs.writeFileSync(debugFileName, JSON.stringify(contentsData, null, 2));
            console.log(`   📄 Saved debug file: ${debugFileName}`);

            console.log(`   📦 Found ${contentsData.results.length} content items\n`);

            // Process each content item
            for (const content of contentsData.results) {
                try {
                    console.log(`   Processing: ${content.title} (${content.content_type})`);

                    // Find matching chapter by title
                    let chapterMatch = lmsChapters.find(c => c.title === content.chapter_title);

                    if (!chapterMatch) {
                        // If no exact match, use first chapter as fallback
                        chapterMatch = lmsChapters[0];
                        console.log(`     ⚠️ Chapter "${content.chapter_title}" not found, using "${chapterMatch.title}"`);
                    }

                    // Map content type
                    let contentType = 'file'; // default
                    let contentUrl = null;
                    let examId = null;

                    switch (content.content_type) {
                        case 'Attachment':
                            contentType = 'pdf';
                            contentUrl = content.attachment_url || content.url;
                            break;
                        case 'Video':
                            contentType = 'video';
                            contentUrl = content.video_url || content.url;
                            break;
                        case 'Exam':
                            contentType = 'exam';
                            // Try to find exam in LMS by title
                            const { data: lmsExam } = await supabase
                                .from('exams')
                                .select('id')
                                .eq('title', content.title)
                                .single();

                            if (lmsExam) {
                                examId = lmsExam.id;
                                console.log(`     ✓ Found exam in LMS: ${content.title}`);
                            } else {
                                console.log(`     ⚠️ Exam "${content.title}" not found in LMS, skipping...`);
                                stats.skipped++;
                                continue;
                            }
                            break;
                        case 'Html':
                            contentType = 'file';
                            contentUrl = content.html_content_url || content.url;
                            break;
                        default:
                            contentType = 'file';
                            contentUrl = content.url;
                    }

                    // Check if content already exists
                    const { data: existing } = await supabase
                        .from('chapter_contents')
                        .select('id')
                        .eq('chapter_id', chapterMatch.id)
                        .eq('title', content.title)
                        .single();

                    if (existing) {
                        console.log(`     ⏭️ Already exists, skipping...`);
                        stats.skipped++;
                        continue;
                    }

                    // Insert content
                    const contentData = {
                        chapter_id: chapterMatch.id,
                        title: content.title,
                        description: content.description || '',
                        type: contentType,
                        content_url: contentUrl,
                        exam_id: examId,
                        order: content.order || 0
                    };

                    const { error: insertError } = await supabase
                        .from('chapter_contents')
                        .insert(contentData);

                    if (insertError) {
                        console.error(`     ❌ Insert failed:`, insertError.message);
                        stats.errors++;
                    } else {
                        console.log(`     ✅ Imported successfully`);
                        stats.imported++;
                    }

                } catch (err) {
                    console.error(`     ❌ Error processing content:`, err.message);
                    stats.errors++;
                }
            }
        }

    } catch (error) {
        console.error('Migration failed:', error);
        stats.errors++;
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('║           MIGRATION SUMMARY          ║');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ Successfully imported: ${stats.imported} content items`);
    console.log(`⏭️ Skipped (duplicates):  ${stats.skipped} content items`);
    console.log(`❌ Errors:                ${stats.errors} content items`);
    console.log(`📊 Total processed:       ${stats.imported + stats.skipped + stats.errors} content items`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('✨ Content migration complete!\n');
}

migrateContent();
