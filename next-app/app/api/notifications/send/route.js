import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/emailHelper';

// Admin Supabase client for bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Send notifications to enrolled students about new content
 * POST /api/notifications/send
 */
export async function POST(req) {
    try {
        const {
            content_id,
            course_id,
            chapter_id,
            content_name,
            chapter_name,
            course_name,
            send_email,
            send_push,
            email_subject,
            email_body,
            push_title,
            push_summary,
            sent_by
        } = await req.json();

        if (!course_id) {
            return NextResponse.json({ success: false, error: 'Course ID is required' }, { status: 400 });
        }

        // Get institute settings
        const { data: settings } = await supabaseAdmin
            .from('institute_settings')
            .select('name, logo_url')
            .single();

        const instituteName = settings?.name || 'LMS Platform';
        const logoUrl = settings?.logo_url || '';
        const loginLink = process.env.NEXT_PUBLIC_BASE_URL || 'https://maheshiesacademy.edustacks.co.in';
        const contentUrl = `${loginLink}/student/course/${course_id}`;
        // Mobile app deep link - opens content directly in the app
        const mobileContentUrl = `maheshiesacademy://course/${course_id}`;

        // Get enrolled students for this course - two step approach
        // Step 1: Get enrollments
        const { data: enrollments, error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .select('student_id, status')
            .eq('course_id', course_id)
            .in('status', ['active', 'completed']);

        if (enrollError) {
            console.error('Error fetching enrollments:', enrollError);
            return NextResponse.json({ success: false, error: 'Failed to fetch enrolled students: ' + enrollError.message }, { status: 500 });
        }

        if (!enrollments || enrollments.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No enrolled students found',
                email_sent: 0,
                push_sent: 0
            });
        }

        // Step 2: Get member details
        const studentIds = enrollments.map(e => e.student_id);
        const { data: members, error: memberError } = await supabaseAdmin
            .from('members')
            .select('id, email, display_name, first_name, last_name')
            .in('id', studentIds);

        if (memberError) {
            console.error('Error fetching members:', memberError);
            return NextResponse.json({ success: false, error: 'Failed to fetch member details: ' + memberError.message }, { status: 500 });
        }

        let emailSentCount = 0;
        let pushSentCount = 0;
        const errors = [];

        // Send email notifications
        if (send_email && email_subject && email_body) {
            for (const member of members) {
                if (!member?.email) continue;

                const studentName = member.display_name ||
                    `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
                    'Student';

                // Replace placeholders
                const personalizedSubject = replacePlaceholders(email_subject, {
                    student_name: studentName,
                    content_name: content_name || 'New Content',
                    chapter_name: chapter_name || '',
                    course_name: course_name || 'Course',
                    institute_name: instituteName,
                    logo_url: logoUrl,
                    content_url: contentUrl,
                    mobile_content_url: mobileContentUrl,
                    login_link: loginLink,
                    username: member.email
                });

                const personalizedBody = replacePlaceholders(email_body, {
                    student_name: studentName,
                    content_name: content_name || 'New Content',
                    chapter_name: chapter_name || '',
                    course_name: course_name || 'Course',
                    institute_name: instituteName,
                    logo_url: logoUrl,
                    content_url: contentUrl,
                    mobile_content_url: mobileContentUrl,
                    login_link: loginLink,
                    username: member.email
                });

                try {
                    const result = await sendEmail({
                        to: member.email,
                        instituteId: 10,
                        subject: personalizedSubject,
                        html: personalizedBody
                    });

                    if (result.success) {
                        emailSentCount++;
                    } else {
                        errors.push(`Email to ${member.email}: ${result.error}`);
                    }
                } catch (err) {
                    errors.push(`Email to ${member.email}: ${err.message}`);
                }
            }
        }

        // Send push notifications
        if (send_push && push_title) {
            // Get push tokens for enrolled students
            const memberIds = members.map(m => m.id);

            const { data: pushTokens, error: tokenError } = await supabaseAdmin
                .from('push_tokens')
                .select('expo_push_token, member_id')
                .in('member_id', memberIds)
                .eq('is_active', true);

            if (!tokenError && pushTokens && pushTokens.length > 0) {
                // Prepare messages for Expo Push API
                const messages = pushTokens.map(token => {
                    const member = members.find(m => m.id === token.member_id);
                    const studentName = member?.display_name ||
                        `${member?.first_name || ''} ${member?.last_name || ''}`.trim() ||
                        'Student';

                    return {
                        to: token.expo_push_token,
                        sound: 'default',
                        title: replacePlaceholders(push_title, {
                            student_name: studentName,
                            content_name: content_name || 'New Content',
                            course_name: course_name || 'Course'
                        }),
                        body: replacePlaceholders(push_summary || '', {
                            student_name: studentName,
                            content_name: content_name || 'New Content',
                            course_name: course_name || 'Course',
                            chapter_name: chapter_name || ''
                        }),
                        data: {
                            content_id,
                            course_id,
                            url: `/course/${course_id}`
                        }
                    };
                });

                // Send to Expo Push API
                try {
                    const response = await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Accept-Encoding': 'gzip, deflate',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(messages)
                    });

                    const result = await response.json();
                    console.log('Expo Push API response:', result);

                    if (result.data) {
                        pushSentCount = result.data.filter(r => r.status === 'ok').length;
                    }
                } catch (err) {
                    console.error('Push notification error:', err);
                    errors.push(`Push notifications: ${err.message}`);
                }
            }
        }

        // Log the notification
        try {
            await supabaseAdmin
                .from('notification_logs')
                .insert({
                    content_id: content_id || null,
                    course_id,
                    sent_by: sent_by || null,
                    notification_type: send_email && send_push ? 'both' : (send_email ? 'email' : 'push'),
                    subject: email_subject || push_title,
                    body: email_body || push_summary,
                    recipients_count: members.length,
                    email_sent_count: emailSentCount,
                    push_sent_count: pushSentCount
                });
        } catch (logError) {
            console.error('Error logging notification:', logError);
        }

        return NextResponse.json({
            success: true,
            message: 'Notifications sent successfully',
            email_sent: emailSentCount,
            push_sent: pushSentCount,
            total_recipients: members.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Error sending notifications:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * Replace placeholder variables in text
 */
function replacePlaceholders(text, variables) {
    if (!text) return '';

    let result = text;
    for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
        result = result.replace(placeholder, value || '');
    }
    return result;
}
