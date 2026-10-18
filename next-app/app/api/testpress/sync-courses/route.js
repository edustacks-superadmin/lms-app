import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTestpressToken, fetchWithRetry } from '../../../../lib/testpressAuth';

export async function POST(request) {
    try {
        // Initialize Supabase client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        const baseUrl = process.env.TESTPRESS_BASE_URL;

        if (!baseUrl) {
            return NextResponse.json(
                { error: 'Testpress base URL not configured' },
                { status: 400 }
            );
        }

        // Get cached token (or fetch new one if needed)
        let token;
        try {
            token = await getTestpressToken();
        } catch (authError) {
            console.error('Testpress authentication error:', authError);
            return NextResponse.json(
                {
                    error: 'Testpress authentication failed',
                    details: authError.message
                },
                { status: 401 }
            );
        }

        console.log('Token received for courses import');

        // Step 2: Fetch ALL courses from Testpress (handle pagination)
        let allCourses = [];
        let nextUrl = `${baseUrl}/api/v2.5/admin/courses/`;
        let pageCount = 0;

        while (nextUrl) {
            pageCount++;
            console.log(`Fetching courses page ${pageCount}: ${nextUrl}`);

            const coursesResponse = await fetchWithRetry(nextUrl, {
                headers: {
                    'Authorization': `JWT ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!coursesResponse.ok) {
                const errorText = await coursesResponse.text();
                console.error('Testpress courses fetch failed:', {
                    status: coursesResponse.status,
                    error: errorText,
                    url: nextUrl
                });
                return NextResponse.json(
                    {
                        error: 'Failed to fetch courses from Testpress',
                        details: `Status ${coursesResponse.status}: ${errorText}`
                    },
                    { status: coursesResponse.status }
                );
            }

            const coursesData = await coursesResponse.json();
            const pageCourses = coursesData.results || [];
            allCourses = allCourses.concat(pageCourses);

            console.log(`Page ${pageCount}: Got ${pageCourses.length} courses, Total: ${allCourses.length}`);

            nextUrl = coursesData.next;
        }

        console.log(`Total courses fetched: ${allCourses.length}`);

        // Step 3: Sync courses to local database
        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            batchRelationships: 0,
            errors: []
        };

        for (const tpCourse of allCourses) {
            try {
                // Check if course already exists by testpress_id
                const { data: existingCourse } = await supabaseAdmin
                    .from('courses')
                    .select('id, title, testpress_id')
                    .eq('testpress_id', tpCourse.id)
                    .single();

                let localCourseId;

                if (existingCourse) {
                    // Update existing course
                    const { error: updateError } = await supabaseAdmin
                        .from('courses')
                        .update({
                            title: tpCourse.title || tpCourse.name,
                            description: tpCourse.description || null
                        })
                        .eq('id', existingCourse.id);

                    if (updateError) {
                        results.failed++;
                        results.errors.push(`Failed to update: ${tpCourse.title || tpCourse.name}`);
                        continue;
                    } else {
                        results.updated++;
                        localCourseId = existingCourse.id;
                    }
                } else {
                    // Insert new course
                    const { data: newCourse, error: insertError } = await supabaseAdmin
                        .from('courses')
                        .insert({
                            title: tpCourse.title || tpCourse.name,
                            description: tpCourse.description || null,
                            testpress_id: tpCourse.id,
                            institute_id: 10
                        })
                        .select()
                        .single();

                    if (insertError) {
                        console.error('Course insert error:', {
                            code: insertError.code,
                            message: insertError.message,
                            course: tpCourse.title || tpCourse.name
                        });

                        if (insertError.code === '23505') {
                            results.skipped++;
                        } else {
                            results.failed++;
                            results.errors.push(`Failed to import: ${tpCourse.title || tpCourse.name} - ${insertError.code}: ${insertError.message}`);
                        }
                        continue;
                    } else {
                        results.imported++;
                        localCourseId = newCourse.id;
                    }
                }

                // Fetch and sync batch relationships for this course
                if (localCourseId) {
                    try {
                        const batchesUrl = `${baseUrl}/api/v2.5/admin/courses/${tpCourse.id}/batches/`;
                        const batchesResponse = await fetchWithRetry(batchesUrl, {
                            headers: {
                                'Authorization': `JWT ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (batchesResponse.ok) {
                            const batchesData = await batchesResponse.json();
                            const courseBatches = batchesData.results || batchesData || [];

                            // Clear existing batch relationships for this course
                            await supabaseAdmin
                                .from('batch_courses')
                                .delete()
                                .eq('course_id', localCourseId);

                            // Insert new batch relationships
                            for (const tpBatch of courseBatches) {
                                // Find local batch by testpress_id
                                const { data: localBatch } = await supabaseAdmin
                                    .from('batches')
                                    .select('id')
                                    .eq('testpress_id', tpBatch.id)
                                    .single();

                                if (localBatch) {
                                    await supabaseAdmin
                                        .from('batch_courses')
                                        .insert({
                                            batch_id: localBatch.id,
                                            course_id: localCourseId
                                        });
                                    results.batchRelationships++;
                                }
                            }
                        }
                    } catch (batchError) {
                        console.error(`Failed to sync batches for course ${tpCourse.title}:`, batchError);
                        // Don't fail the entire course import if batch sync fails
                    }
                }
            } catch (error) {
                results.failed++;
                results.errors.push(`Error: ${tpCourse.title || tpCourse.name} - ${error.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            total: allCourses.length,
            results
        });

    } catch (error) {
        console.error('Testpress courses sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
