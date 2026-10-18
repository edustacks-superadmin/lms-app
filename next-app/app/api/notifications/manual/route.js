import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getInstituteIdFromRequest } from '@/lib/server/getInstituteFromRequest';

// Admin Supabase client for bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Send manual notification to all users (push and/or email)
 * POST /api/notifications/manual
 */
export async function POST(req) {
    try {
        const { title, body, channel, target } = await req.json();
        const instituteId = await getInstituteIdFromRequest(req);

        if (!title || !body) {
            return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
        }

        let recipientsCount = 0;
        let successCount = 0;
        let failedCount = 0;

        // Send Push Notifications
        if (channel === 'push' || channel === 'both') {
            const { data: pushTokens } = await supabaseAdmin
                .from('push_tokens')
                .select('expo_push_token, members!inner(institute_id)')
                .eq('is_active', true)
                .eq('members.institute_id', instituteId);

            if (pushTokens && pushTokens.length > 0) {
                console.log(`[Manual Push] Found ${pushTokens.length} active tokens.`);
                const messages = pushTokens.map(token => ({
                    to: token.expo_push_token,
                    sound: 'default',
                    title: title,
                    body: body,
                    data: { type: 'manual' }
                }));

                // Send in batches of 100
                const batchSize = 100;
                for (let i = 0; i < messages.length; i += batchSize) {
                    const batch = messages.slice(i, i + batchSize);

                    const response = await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(batch)
                    });

                    const result = await response.json();
                    console.log('[Manual Push] Expo Result:', JSON.stringify(result));

                    const sent = result.data?.filter(r => r.status === 'ok').length || 0;
                    successCount += sent;
                    failedCount += batch.length - sent;
                }
                recipientsCount += pushTokens.length;
            } else {
                console.log('[Manual Push] No active push tokens found.');
            }
        }

        // Send Email Notifications
        if (channel === 'email' || channel === 'both') {
            try {
                // Get all members with email for THIS institute
                const { data: members } = await supabaseAdmin
                    .from('members')
                    .select('email')
                    .eq('institute_id', instituteId)
                    .not('email', 'is', null);

                if (members && members.length > 0) {
                    if (!process.env.RESEND_API_KEY) {
                        console.warn('[Manual Email] Skipped: RESEND_API_KEY is missing.');
                    } else {
                        // Use your email service (Resend, etc.)
                        try {
                            const { Resend } = await import('resend');
                            const resend = new Resend(process.env.RESEND_API_KEY);

                            // Send emails in batches
                            const batchSize = 50;
                            for (let i = 0; i < members.length; i += batchSize) {
                                const batch = members.slice(i, i + batchSize);

                                const emailPromises = batch.map(member =>
                                    resend.emails.send({
                                        from: process.env.EMAIL_FROM || 'noreply@edustacks.co.in',
                                        to: member.email,
                                        subject: title,
                                        html: `<p>${body}</p>`
                                    }).catch(() => null)
                                );

                                const results = await Promise.all(emailPromises);
                                const sent = results.filter(r => r !== null).length;
                                successCount += sent;
                                failedCount += batch.length - sent;
                            }
                            recipientsCount += members.length;
                        } catch (emailError) {
                            console.error('Email sending error:', emailError);
                        }
                    }
                }
            } catch (outerEmailError) {
                console.error('Email block error:', outerEmailError);
            }
        }

        // Log the notification
        const pushSent = (channel === 'push' || channel === 'both') ? successCount : 0;
        const emailSent = (channel === 'email' || channel === 'both') ? successCount : 0;

        await supabaseAdmin
            .from('notification_logs')
            .insert({
                notification_type: 'manual',
                subject: title,
                body: body,
                recipients_count: recipientsCount,
                push_sent_count: pushSent,
                email_sent_count: emailSent
            });

        return NextResponse.json({
            success: true,
            recipients_count: recipientsCount,
            success_count: successCount,
            failed_count: failedCount
        });

    } catch (error) {
        console.error('Manual notification error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
