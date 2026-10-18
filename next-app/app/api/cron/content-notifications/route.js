import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin Supabase client for bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Cron endpoint for scheduled content notifications (PDF, video)
 * Called by cron-job.org every minute
 * GET /api/cron/content-notifications
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

        // Find content that is now available but hasn't been notified yet
        const { data: contentToNotify, error: fetchError } = await supabaseAdmin
            .from('chapter_contents')
            .select(`
                id, title, type, chapter_id,
                chapters!inner(course_id, courses(title))
            `)
            .lte('available_from', now.toISOString())
            .eq('notification_sent', false)
            .in('type', ['pdf', 'video']);

        if (fetchError) {
            console.error('Error fetching content:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!contentToNotify || contentToNotify.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No content to notify',
                checked_at: now.toISOString()
            });
        }

        console.log(`Found ${contentToNotify.length} content items to notify`);

        let totalNotificationsSent = 0;

        for (const content of contentToNotify) {
            try {
                const courseId = content.chapters?.course_id;
                const courseName = content.chapters?.courses?.title || 'Course';

                if (!courseId) {
                    console.log(`Content ${content.id} not linked to a course, skipping`);
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
                    // Still mark as notified to avoid re-processing
                    await supabaseAdmin
                        .from('chapter_contents')
                        .update({ notification_sent: true })
                        .eq('id', content.id);
                    continue;
                }

                const memberIds = enrollments.map(e => e.member_id);

                // Get push tokens
                const { data: pushTokens } = await supabaseAdmin
                    .from('push_tokens')
                    .select('expo_push_token')
                    .in('member_id', memberIds)
                    .eq('is_active', true);

                if (pushTokens && pushTokens.length > 0) {
                    const contentIcon = content.type === 'pdf' ? '📄' : '🎬';
                    const contentLabel = content.type === 'pdf' ? 'PDF' : 'Video';

                    // Prepare push messages
                    const messages = pushTokens.map(token => ({
                        to: token.expo_push_token,
                        sound: 'default',
                        title: `${contentIcon} New ${contentLabel} Available!`,
                        body: `"${content.title}" is now available in ${courseName}.`,
                        data: {
                            type: 'new_content',
                            content_id: content.id,
                            content_type: content.type,
                            course_id: courseId,
                            url: `/course/${courseId}`
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
                    console.log(`Content ${content.id} push response:`, JSON.stringify(result, null, 2));

                    const sentCount = result.data?.filter(r => r.status === 'ok').length || 0;
                    totalNotificationsSent += sentCount;

                    console.log(`Sent ${sentCount} notifications for content ${content.id}`);
                }

                // Mark content as notified
                await supabaseAdmin
                    .from('chapter_contents')
                    .update({ notification_sent: true })
                    .eq('id', content.id);

            } catch (contentError) {
                console.error(`Error processing content ${content.id}:`, contentError);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${contentToNotify.length} content items`,
            notifications_sent: totalNotificationsSent,
            checked_at: now.toISOString()
        });

    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
