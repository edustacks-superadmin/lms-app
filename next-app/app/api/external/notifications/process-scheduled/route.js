
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin Supabase client for bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Process scheduled posts and send notifications
 * POST /api/external/notifications/process-scheduled
 */
export async function POST(req) {
    try {
        const apiKey = req.headers.get('x-api-key');

        if (!apiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 401 });
        }

        // 1. Verify API Key and get Institute
        const { data: institute, error: instError } = await supabaseAdmin
            .from('institute_settings')
            .select('id, name')
            .eq('internal_api_key', apiKey)
            .single();

        if (instError || !institute) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        // 2. Find due posts that haven't been notified yet
        const now = new Date().toISOString();
        const { data: duePosts, error: postError } = await supabaseAdmin
            .from('posts')
            .select(`
                *,
                post_batches(batch_id)
            `)
            .eq('institute_id', institute.id)
            .eq('notification_sent', false)
            .lte('publication_date', now)
            .eq('is_deleted', false);

        if (postError) {
            console.error('Error fetching due posts:', postError);
            return NextResponse.json({ error: 'Failed to fetch due posts' }, { status: 500 });
        }

        if (!duePosts || duePosts.length === 0) {
            return NextResponse.json({ success: true, message: 'No pending notifications' });
        }

        const results = [];

        // 3. Process each post
        for (const post of duePosts) {
            let targetMemberIds = new Set();

            if (post.access_control === 'Public') {
                // Public post: Target all members with tokens in this institute
                const { data: allTokens } = await supabaseAdmin
                    .from('push_tokens')
                    .select('member_id')
                    .eq('is_active', true);
                // Filter by institute if possible, otherwise we trust token registration context

                // Note: members are linked to institutes. Let's find members for this institute first.
                const { data: instMembers } = await supabaseAdmin
                    .from('members')
                    .select('id')
                    .eq('institute_id', institute.id);

                if (instMembers) {
                    instMembers.forEach(m => targetMemberIds.add(m.id));
                }
            } else {
                // Restricted post: Combine Batch and Product audiences

                // Batch audience
                if (post.post_batches && post.post_batches.length > 0) {
                    const batchIds = post.post_batches.map(pb => pb.batch_id);
                    const { data: batchMems } = await supabaseAdmin
                        .from('batch_members')
                        .select('member_id')
                        .in('batch_id', batchIds);

                    if (batchMems) {
                        batchMems.forEach(m => targetMemberIds.add(m.id));
                    }
                }

                // Product audience
                if (post.allowed_products && post.allowed_products.length > 0) {
                    const { data: productEnrolls } = await supabaseAdmin
                        .from('enrollments')
                        .select('student_id')
                        .in('course_id', post.allowed_products)
                        .in('status', ['active', 'completed']);

                    if (productEnrolls) {
                        productEnrolls.forEach(e => targetMemberIds.add(e.student_id));
                    }
                }
            }

            if (targetMemberIds.size > 0) {
                // 4. Fetch Push Tokens for these members
                const { data: tokens } = await supabaseAdmin
                    .from('push_tokens')
                    .select('expo_push_token, member_id')
                    .in('member_id', Array.from(targetMemberIds))
                    .eq('is_active', true);

                if (tokens && tokens.length > 0) {
                    const messages = tokens.map(t => ({
                        to: t.expo_push_token,
                        sound: 'default',
                        title: post.title,
                        body: post.summary || post.description || 'New update from ' + institute.name,
                        data: {
                            type: 'post',
                            id: post.id,
                            slug: post.slug,
                            url: `/posts/${post.id}`
                        }
                    }));

                    // 5. Send to Expo
                    try {
                        const response = await fetch('https://exp.host/--/api/v2/push/send', {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(messages)
                        });
                        const result = await response.json();
                        results.push({ post_id: post.id, sent: true, recipient_count: tokens.length });
                    } catch (err) {
                        console.error('Expo send error:', err);
                        results.push({ post_id: post.id, sent: false, error: err.message });
                    }
                }
            }

            // 6. Mark as sent (even if no tokens found, to avoid reprocessing)
            await supabaseAdmin
                .from('posts')
                .update({ notification_sent: true })
                .eq('id', post.id);
        }

        return NextResponse.json({
            success: true,
            processed_posts: results.length,
            details: results
        });

    } catch (error) {
        console.error('Notification processor error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
