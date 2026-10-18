import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin Supabase client for bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Cron endpoint for scheduled post notifications
 * Called by cron-job.org every minute
 * GET /api/cron/post-notifications
 * 
 * Access Control Logic:
 * - Public posts (access_control = 'Public') → Notify all users
 * - Private posts → Notify only users in linked batches or products
 */
export async function GET(req) {
    try {
        // Verify cron secret (optional but recommended)
        const cronSecret = req.headers.get('x-cron-secret');
        const expectedSecret = process.env.CRON_SECRET;

        if (expectedSecret && cronSecret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use IST for comparison since DB stores dates as "Local Time Face Value"
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const nowIST = new Date(now.getTime() + istOffset);

        // Find posts that are published but haven't been notified yet
        const { data: postsToNotify, error: fetchError } = await supabaseAdmin
            .from('posts')
            .select('id, title, slug, summary, cover_image, publication_date, access_control, allowed_products, institute_id')
            .eq('status', 'published')
            .eq('notification_sent', false)
            .eq('is_deleted', false)
            .or(`publication_date.is.null,publication_date.lte.${nowIST.toISOString()}`);

        if (fetchError) {
            console.error('Error fetching posts:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!postsToNotify || postsToNotify.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No posts to notify',
                checked_at: now.toISOString()
            });
        }

        console.log(`Found ${postsToNotify.length} posts to notify`);

        let totalNotificationsSent = 0;

        for (const post of postsToNotify) {
            try {
                let pushTokens = [];
                const isPublic = post.access_control === 'Public';

                if (isPublic) {
                    // Public posts: Notify active push tokens ONLY for this institute
                    // Joining with members to filter by institute_id
                    const { data: tokens } = await supabaseAdmin
                        .from('push_tokens')
                        .select('expo_push_token, members!inner(institute_id)')
                        .eq('is_active', true)
                        .eq('members.institute_id', post.institute_id);

                    pushTokens = tokens || [];
                    console.log(`Post ${post.id} (Inst: ${post.institute_id}) is PUBLIC, notifying ${pushTokens.length} users in this institute`);
                } else {
                    // Private posts: Get batches from post_batches junction table
                    const { data: postBatches } = await supabaseAdmin
                        .from('post_batches')
                        .select('batch_id')
                        .eq('post_id', post.id);

                    const batchIds = postBatches?.map(pb => pb.batch_id) || [];
                    const productIds = post.allowed_products || [];

                    if (batchIds.length === 0 && productIds.length === 0) {
                        console.log(`Post ${post.id} is PRIVATE but has no batches/products linked, skipping notifications`);
                        await supabaseAdmin
                            .from('posts')
                            .update({ notification_sent: true })
                            .eq('id', post.id);
                        continue;
                    }

                    // Get member IDs from batch_members and product enrollments
                    let memberIds = new Set();

                    if (batchIds.length > 0) {
                        const { data: batchMembers } = await supabaseAdmin
                            .from('batch_members')
                            .select('member_id')
                            .in('batch_id', batchIds);

                        if (batchMembers) {
                            batchMembers.forEach(e => memberIds.add(e.member_id));
                        }
                        console.log(`Found ${batchMembers?.length || 0} members in ${batchIds.length} batches`);
                    }

                    if (productIds.length > 0) {
                        // Get orders for these products (purchased products)
                        const { data: productOrders } = await supabaseAdmin
                            .from('orders')
                            .select('member_id')
                            .in('product_id', productIds)
                            .eq('status', 'completed');

                        if (productOrders) {
                            productOrders.forEach(e => memberIds.add(e.member_id));
                        }
                        console.log(`Found ${productOrders?.length || 0} members from ${productIds.length} products`);
                    }

                    if (memberIds.size === 0) {
                        console.log(`Post ${post.id} is PRIVATE, no enrolled members found`);
                        await supabaseAdmin
                            .from('posts')
                            .update({ notification_sent: true })
                            .eq('id', post.id);
                        continue;
                    }

                    // Get push tokens for these members
                    const { data: tokens } = await supabaseAdmin
                        .from('push_tokens')
                        .select('expo_push_token')
                        .in('member_id', Array.from(memberIds))
                        .eq('is_active', true);

                    pushTokens = tokens || [];
                    console.log(`Post ${post.id} is PRIVATE, notifying ${pushTokens.length} enrolled users`);
                }

                if (pushTokens.length > 0) {
                    // Prepare push messages
                    const messages = pushTokens.map(token => ({
                        to: token.expo_push_token,
                        sound: 'default',
                        title: '📰 New Post!',
                        body: post.title,
                        data: {
                            type: 'new_post',
                            post_id: post.id,
                            slug: post.slug,
                            url: `/posts/${post.slug || post.id}`
                        }
                    }));

                    // Send to Expo Push API in batches of 100
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
                        console.log(`Post ${post.id} batch ${i / batchSize + 1}:`, JSON.stringify(result, null, 2));

                        const sentCount = result.data?.filter(r => r.status === 'ok').length || 0;
                        totalNotificationsSent += sentCount;
                    }

                    console.log(`Sent notifications for post ${post.id}: "${post.title}"`);
                }

                // Mark post as notified
                await supabaseAdmin
                    .from('posts')
                    .update({ notification_sent: true })
                    .eq('id', post.id);

            } catch (postError) {
                console.error(`Error processing post ${post.id}:`, postError);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${postsToNotify.length} posts`,
            notifications_sent: totalNotificationsSent,
            checked_at: now.toISOString()
        });

    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
