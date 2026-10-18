import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTestpressToken, fetchWithRetry } from '../../../../lib/testpressAuth';
import { createJob, updateJob, updateProgress, completeJob, failJob } from '../../../../lib/jobTracker';

export async function POST(request) {
    try {
        // Create job immediately and return
        const jobId = createJob('courses-sync');

        // Start background processing (don't await)
        processCoursesInBackground(jobId).catch(error => {
            console.error('Background processing error:', error);
            failJob(jobId, error);
        });

        return NextResponse.json({
            success: true,
            jobId,
            message: 'Import started in background'
        });

    } catch (error) {
        console.error('Error starting import:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to start import' },
            { status: 500 }
        );
    }
}

async function processCoursesInBackground(jobId) {
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

    try {
        updateJob(jobId, { status: 'running' });
        updateProgress(jobId, 0, 0, 'Authenticating with Testpress...');

        // Get token
        const token = await getTestpressToken();

        updateProgress(jobId, 0, 0, 'Fetching courses from Testpress...');

        // Fetch all courses
        let allCourses = [];
        let nextUrl = `${baseUrl}/api/v2.5/admin/courses/`;
        let pageCount = 0;

        while (nextUrl) {
            pageCount++;
            const coursesResponse = await fetchWithRetry(nextUrl, {
                headers: {
                    'Authorization': `JWT ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!coursesResponse.ok) {
                throw new Error(`Failed to fetch courses: ${coursesResponse.status}`);
            }

            const coursesData = await coursesResponse.json();
            const pageCourses = coursesData.results || [];
            allCourses = allCourses.concat(pageCourses);

            updateProgress(jobId, allCourses.length, allCourses.length, `Fetched ${allCourses.length} courses...`);

            nextUrl = coursesData.next;
        }

        const totalCourses = allCourses.length;
        updateProgress(jobId, 0, totalCourses, `Processing ${totalCourses} courses...`);

        // Process courses
        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            batchRelationships: 0,
            errors: []
        };

        const CHUNK_SIZE = 10; // Process 10 courses at a time

        for (let i = 0; i < allCourses.length; i++) {
            const tpCourse = allCourses[i];

            try {
                // Check if already imported (RESUMABLE)
                const { data: existingCourse } = await supabaseAdmin
                    .from('courses')
                    .select('id, title, testpress_id')
                    .eq('testpress_id', tpCourse.id)
                    .single();

                let localCourseId;

                if (existingCourse) {
                    // Update existing
                    const { error: updateError } = await supabaseAdmin
                        .from('courses')
                        .update({
                            title: tpCourse.title || tpCourse.name,
                            description: tpCourse.description || null
                        })
                        .eq('id', existingCourse.id);

                    if (!updateError) {
                        results.updated++;
                        localCourseId = existingCourse.id;
                    } else {
                        results.failed++;
                        results.errors.push(`Update failed: ${tpCourse.title}`);
                    }
                } else {
                    // Insert new
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

                    if (!insertError && newCourse) {
                        results.imported++;
                        localCourseId = newCourse.id;
                    } else if (insertError?.code === '23505') {
                        results.skipped++;
                    } else {
                        results.failed++;
                        results.errors.push(`Import failed: ${tpCourse.title}`);
                    }
                }

                // Sync batch relationships
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

                            // Clear old relationships
                            await supabaseAdmin
                                .from('batch_courses')
                                .delete()
                                .eq('course_id', localCourseId);

                            // Add new relationships
                            for (const tpBatch of courseBatches) {
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
                        console.error(`Batch sync failed for ${tpCourse.title}:`, batchError);
                    }
                }

            } catch (error) {
                results.failed++;
                results.errors.push(`Error: ${tpCourse.title} - ${error.message}`);
            }

            // Update progress
            updateProgress(
                jobId,
                i + 1,
                totalCourses,
                `Processed ${i + 1}/${totalCourses} courses (${results.imported} imported, ${results.updated} updated)`
            );

            // Small delay every chunk to avoid overload
            if ((i + 1) % CHUNK_SIZE === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        completeJob(jobId, {
            total: totalCourses,
            ...results
        });

    } catch (error) {
        console.error('Background processing error:', error);
        failJob(jobId, error);
    }
}
