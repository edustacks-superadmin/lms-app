import { NextResponse } from 'next/server';
import { getTestpressToken, fetchWithRetry } from '../../../../lib/testpressAuth';

const TESTPRESS_BASE_URL = process.env.TESTPRESS_BASE_URL || 'https://maheshiesacademy.testpress.in';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get('courseId'); // Optional: sync specific course

        console.log('🔄 Starting Testpress chapters sync...');
        const startTime = Date.now();

        // Get authentication token
        const token = await getTestpressToken();

        // Step 1: Get all courses from local database
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        let coursesQuery = supabase.from('courses').select('id, testpress_id');
        if (courseId) {
            coursesQuery = coursesQuery.eq('id', courseId);
        }

        const { data: courses, error: coursesError } = await coursesQuery;

        if (coursesError) throw coursesError;

        console.log(`📚 Found ${courses.length} courses to sync chapters for`);

        let totalChapters = 0;
        let processedCourses = 0;
        const results = [];

        // Step 2: For each course, fetch and sync chapters
        for (const course of courses) {
            if (!course.testpress_id) {
                console.log(`⏭️  Skipping course ${course.id} - no testpress_id`);
                continue;
            }

            try {
                // Fetch chapters from Testpress
                const chaptersUrl = `${TESTPRESS_BASE_URL}/api/v2.5/admin/courses/${course.testpress_id}/chapters/`;
                console.log(`Fetching chapters from: ${chaptersUrl}`);

                const response = await fetchWithRetry(chaptersUrl, {
                    headers: {
                        'Authorization': `JWT ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                }

                const chaptersData = await response.json();
                let chapters = chaptersData.results || chaptersData || [];
                
                // Handle pagination for chapters if there are more
                let nextChapterUrl = chaptersData.next;
                while (nextChapterUrl) {
                    console.log(`Fetching next page of chapters: ${nextChapterUrl}`);
                    const nextRes = await fetchWithRetry(nextChapterUrl, {
                        headers: {
                            'Authorization': `JWT ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    const nextData = await nextRes.json();
                    chapters = chapters.concat(nextData.results || []);
                    nextChapterUrl = nextData.next;
                }

                console.log(`📖 Course ${course.testpress_id}: Found ${chapters.length} chapters`);

                // Map of testpress_id -> chapter data (for second pass)
                const chapterMap = new Map();

                // Pass 1: Upsert all chapters without parent_id to ensure they exist
                for (const chapter of chapters) {
                    chapterMap.set(chapter.id, chapter);

                    const chapterRecord = {
                        course_id: course.id,
                        testpress_id: chapter.id,
                        name: chapter.name || chapter.title,
                        icon: chapter.image || null,
                        order: chapter.order || 0,
                        // temporary null parent_id
                    };

                    const { error: upsertError } = await supabase
                        .from('chapters')
                        .upsert(chapterRecord, {
                            onConflict: 'testpress_id',
                            ignoreDuplicates: false
                        });

                    if (upsertError) {
                        console.error(`Error upserting chapter ${chapter.id}:`, upsertError);
                    } else {
                        totalChapters++;
                    }
                }

                // Pass 2: Update parent relationships
                console.log(`🔗 Linking parent chapters for Course ${course.testpress_id}...`);
                
                // Fetch all local chapters for this course to get their IDs
                const { data: localChapters } = await supabase
                    .from('chapters')
                    .select('id, testpress_id')
                    .eq('course_id', course.id)
                    .not('testpress_id', 'is', null);

                const tpIdToLocalId = new Map();
                localChapters?.forEach(ch => tpIdToLocalId.set(ch.testpress_id, ch.id));

                for (const chapter of chapters) {
                    // Check if chapter has a parent
                    // parent_url format: .../chapters/<id>/
                    if (chapter.parent_url) {
                        try {
                            // Extract parent ID from URL
                            // splits by '/' and gets the item before the last empty string
                            // e.g. .../chapters/123/ -> ["...", "chapters", "123", ""]
                            const parts = chapter.parent_url.split('/').filter(p => p.length > 0);
                            const parentTpId = parseInt(parts[parts.length - 1]);
                            
                            if (parentTpId && tpIdToLocalId.has(parentTpId)) {
                                const localParentId = tpIdToLocalId.get(parentTpId);
                                
                                await supabase
                                    .from('chapters')
                                    .update({ parent_id: localParentId })
                                    .eq('testpress_id', chapter.id);
                            }
                        } catch (e) {
                            console.error(`Error linking parent for chapter ${chapter.id}:`, e);
                        }
                    }
                }

                processedCourses++;
                results.push({
                    course_id: course.id,
                    testpress_id: course.testpress_id,
                    chapters_synced: chapters.length
                });

            } catch (error) {
                console.error(`Error syncing chapters for course ${course.testpress_id}:`, error);
                results.push({
                    course_id: course.id,
                    testpress_id: course.testpress_id,
                    error: error.message
                });
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        return NextResponse.json({
            success: true,
            message: 'Chapters sync completed',
            stats: {
                total_courses: courses.length,
                processed_courses: processedCourses,
                total_chapters_synced: totalChapters,
                duration_seconds: duration
            },
            results
        });

    } catch (error) {
        console.error('Chapters sync error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
