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

        const startTime = Date.now();
        const headers = {
            'Content-Type': 'application/json',
        };

        // 1. Authenticate with Testpress
        let token;
        try {
            token = await getTestpressToken();
        } catch (authError) {
            if (authError.message.includes('Rate limited')) {
                return NextResponse.json({ error: authError.message }, { status: 429 });
            }
            throw authError;
        }

        headers['Authorization'] = `JWT ${token}`;
        const baseUrl = process.env.TESTPRESS_BASE_URL;

        // 2. Load Local Mappings (Courses, Chapters, Exams)
        const { data: courses } = await supabaseAdmin
            .from('courses')
            .select('id, testpress_id')
            .not('testpress_id', 'is', null);

        const { data: chapters } = await supabaseAdmin
            .from('chapters')
            .select('id, testpress_id')
            .not('testpress_id', 'is', null);

        const { data: exams } = await supabaseAdmin
            .from('exams')
            .select('id, testpress_id') // Ensure exams table has testpress_id now
            .not('testpress_id', 'is', null);

        // Create lookup maps
        const chapterMap = new Map(chapters?.map(c => [c.testpress_id, c.id]) || []);
        const examMap = new Map(exams?.map(e => [e.testpress_id, e.id]) || []);

        // 3. Iterate Courses and Sync Contents
        let totalSynced = 0;
        let totalSkipped = 0;
        let totalErrors = 0;

        // We can accept a `course_id` param to sync singular course, else sync all
        // For now, sync all found in DB
        const coursesToSync = courses || [];

        console.log(`Starting sync for ${coursesToSync.length} courses...`);

        for (const course of coursesToSync) {
            console.log(`Syncing contents for Course ${course.id} (TP: ${course.testpress_id})`);

            let nextUrl = `${baseUrl}/api/v2.5/admin/courses/${course.testpress_id}/contents/`;

            while (nextUrl) {
                try {
                    const response = await fetchWithRetry(nextUrl, { headers });

                    if (!response.ok) {
                        console.error(`Failed to fetch contents for course ${course.testpress_id}: ${response.status}`);
                        break;
                    }

                    const data = await response.json();
                    const contents = data.results || [];
                    nextUrl = data.next;

                    for (const item of contents) {
                        try {
                            // Determine type and basic fields
                            // TP types: "Attachment", "Video", "Exam", "Note", "Html"
                            // Local types: "pdf", "video", "exam", "file"

                            let type = 'file';
                            let url = item.attachment?.attachment_file || item.url || null; // API varies
                            // Usually item.url is the API url for object.
                            // For Attachment, it has 'attachment_file' or 'file'?
                            // For Video, 'embed_code' or 'url'?

                            // We need to robustly map fields based on inspected API (which we lacked perfect view of, but can infer)
                            // item.content_type might be "Exam", "Attachment", "Video"

                            const tpType = item.content_type || item.type;
                            let localType = 'file';
                            let fileUrl = null;

                            if (tpType === 'Attachment') {
                                localType = 'file';
                                fileUrl = item.attachment?.attachment_file || item.url; // Fallback
                                if (fileUrl && fileUrl.endsWith('.pdf')) localType = 'pdf';
                            } else if (tpType === 'Video') {
                                localType = 'video';
                                fileUrl = item.video?.url || item.url;
                            } else if (tpType === 'Exam') {
                                localType = 'exam';
                            } else if (tpType === 'Notes') {
                                localType = 'file'; // or ignore
                            }

                            // Link to Chapter
                            // item.chapter_id should exist
                            const localChapterId = chapterMap.get(item.chapter_id);

                            if (!localChapterId) {
                                // console.log(`Skipping content ${item.id} - Chapter ${item.chapter_id} not found locally.`);
                                totalSkipped++;
                                continue;
                            }

                            // Link to Exam
                            let localExamId = null;
                            if (localType === 'exam') {
                                const tpExamId = item.exam?.id || item.exam_id;
                                if (tpExamId) {
                                    localExamId = examMap.get(tpExamId);

                                    // Link to course_exams if needed
                                    if (localExamId && course.id) {
                                        const { data: existingLink } = await supabaseAdmin
                                            .from('course_exams')
                                            .select('*')
                                            .eq('course_id', course.id)
                                            .eq('exam_id', localExamId)
                                            .single();
                                        
                                        if (!existingLink) {
                                            await supabaseAdmin.from('course_exams').insert({
                                                course_id: course.id,
                                                exam_id: localExamId
                                            });
                                        }
                                    }
                                }
                            }

                            // Prepare Payload
                            const payload = {
                                testpress_id: item.id,
                                title: item.name || item.title || 'Untitled',
                                // description: item.description || null, // if we added it
                                type: localType,
                                url: fileUrl,
                                chapter_id: localChapterId,
                                exam_id: localExamId,
                                is_locked: item.is_locked || false,
                                free_preview: item.is_trial || false,
                                order: item.order || 0
                            };

                            if (item.description) payload.description = item.description;

                            // Upsert
                            // We use testpress_id as unique key
                            const { error } = await supabaseAdmin
                                .from('chapter_contents')
                                .upsert(payload, { onConflict: 'testpress_id' });

                            if (error) {
                                console.error(`Error upserting content ${item.id}:`, error);
                                totalErrors++;
                            } else {
                                totalSynced++;
                            }

                        } catch (innerErr) {
                            console.error(`Error processing content item ${item.id}:`, innerErr);
                            totalErrors++;
                        }
                    }

                } catch (err) {
                    console.error(`Error fetching/processing page for course ${course.testpress_id}:`, err);
                    break;
                }
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        return NextResponse.json({
            success: true,
            summary: {
                synced: totalSynced,
                skipped: totalSkipped,
                errors: totalErrors,
                durationSeconds: duration
            }
        });

    } catch (error) {
        console.error('Content Sync Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
