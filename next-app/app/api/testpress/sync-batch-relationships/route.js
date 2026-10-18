import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTestpressToken, fetchWithRetry } from '../../../../lib/testpressAuth';

export async function POST(request) {
    try {
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
        const token = await getTestpressToken();

        // Get all courses with testpress_id
        const { data: localCourses, error: coursesError } = await supabaseAdmin
            .from('courses')
            .select('id, testpress_id')
            .not('testpress_id', 'is', null);

        if (coursesError) {
            throw new Error(`Failed to fetch courses: ${coursesError.message}`);
        }

        console.log(`Found ${localCourses.length} courses with testpress_id`);

        let totalRelationships = 0;
        let errors = [];

        for (const course of localCourses) {
            try {
                // Fetch batches for this course from Testpress
                const batchesUrl = `${baseUrl}/api/v2.5/admin/courses/${course.testpress_id}/batches/`;
                const batchesResponse = await fetchWithRetry(batchesUrl, {
                    headers: {
                        'Authorization': `JWT ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (batchesResponse.ok) {
                    const batchesData = await batchesResponse.json();
                    const courseBatches = batchesData.results || batchesData || [];

                    console.log(`Course ${course.id}: Found ${courseBatches.length} batches`);

                    // Clear existing relationships
                    await supabaseAdmin
                        .from('batch_courses')
                        .delete()
                        .eq('course_id', course.id);

                    // Insert new relationships
                    for (const tpBatch of courseBatches) {
                        const { data: localBatch } = await supabaseAdmin
                            .from('batches')
                            .select('id')
                            .eq('testpress_id', tpBatch.id)
                            .single();

                        if (localBatch) {
                            const { error: insertError } = await supabaseAdmin
                                .from('batch_courses')
                                .insert({
                                    batch_id: localBatch.id,
                                    course_id: course.id
                                });

                            if (!insertError) {
                                totalRelationships++;
                            } else {
                                console.error(`Insert error for course ${course.id}, batch ${tpBatch.id}:`, insertError);
                            }
                        }
                    }
                }
            } catch (error) {
                errors.push(`Course ${course.id}: ${error.message}`);
                console.error(`Error syncing course ${course.id}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            coursesProcessed: localCourses.length,
            relationshipsCreated: totalRelationships,
            errors: errors
        });

    } catch (error) {
        console.error('Batch relationships sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
