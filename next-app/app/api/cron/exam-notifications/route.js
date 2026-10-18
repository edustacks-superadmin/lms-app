import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin Supabase client for bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Cron endpoint for scheduled exam notifications
 * Called by cron-job.org every minute
 * GET /api/cron/exam-notifications
 */
export async function GET(req) {
    try {
        // Verify cron secret (optional but recommended)
        const cronSecret = req.headers.get('x-cron-secret');
        const expectedSecret = process.env.CRON_SECRET;

        if (expectedSecret && cronSecret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();

        // Find exams that have started (start_date <= now) but haven't been notified yet
        const { data: examsToNotify, error: fetchError } = await supabaseAdmin
            .from('exams')
            .select('id, title, start_date, course_id')
            .lte('start_date', now.toISOString())
            .eq('notification_sent', false)
            .eq('is_active', true);

        if (fetchError) {
            console.error('Error fetching exams:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!examsToNotify || examsToNotify.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No exams to notify',
                checked_at: now.toISOString()
            });
        }

        console.log(`Found ${examsToNotify.length} exams to notify`);

        let totalNotificationsSent = 0;

        for (const exam of examsToNotify) {
            try {
                // Get course info to find enrolled students
                const { data: courseLinks } = await supabaseAdmin
                    .from('chapter_contents')
                    .select('chapters!inner(course_id, courses(title))')
                    .eq('exam_id', exam.id)
                    .limit(1);

                const courseInfo = courseLinks?.[0]?.chapters;
                const courseId = courseInfo?.course_id;
                const courseName = courseInfo?.courses?.title || 'Course';

                if (!courseId) {
                    console.log(`Exam ${exam.id} not linked to any course, skipping`);
                    continue;
                }

                // Get enrolled students
                const { data: enrollments } = await supabaseAdmin
                    .from('enrollments')
                    .select('member_id')
                    .eq('course_id', courseId)
                    .in('status', ['active', 'completed']);

                if (!enrollments || enrollments.length === 0) {
                    console.log(`No enrolled students for course ${courseId}`);
                    continue;
                }

                const studentIds = enrollments.map(e => e.member_id);

                // Get push tokens
                const { data: pushTokens } = await supabaseAdmin
                    .from('push_tokens')
                    .select('expo_push_token')
                    .in('member_id', studentIds)
                    .eq('is_active', true);

                if (pushTokens && pushTokens.length > 0) {
                    // Prepare push messages
                    const messages = pushTokens.map(token => ({
                        to: token.expo_push_token,
                        sound: 'default',
                        title: '⏰ Exam Started!',
                        body: `Your exam "${exam.title}" is now available. Good luck!`,
                        data: {
                            type: 'exam_started',
                            exam_id: exam.id,
                            course_id: courseId,
                            url: `/exam/${exam.id}/take?courseId=${courseId}`
                        }
                    }));

                    // Send to Expo Push API
                    const response = await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(messages)
                    });

                    const result = await response.json();
                    console.log('Expo Push API Response:', JSON.stringify(result, null, 2));

                    const sentCount = result.data?.filter(r => r.status === 'ok').length || 0;
                    totalNotificationsSent += sentCount;

                    console.log(`Sent ${sentCount} notifications for exam ${exam.id}`);
                }

                // Mark exam as notified
                await supabaseAdmin
                    .from('exams')
                    .update({ notification_sent: true })
                    .eq('id', exam.id);

            } catch (examError) {
                console.error(`Error processing exam ${exam.id}:`, examError);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${examsToNotify.length} exams`,
            notifications_sent: totalNotificationsSent,
            checked_at: now.toISOString()
        });

    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
