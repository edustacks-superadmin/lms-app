'use server';

import { supabaseAdmin } from '../../lib/supabase';
import { cookies } from 'next/headers';

export async function incrementPostView(postId) {
    if (!postId) return { success: false };

    try {
        const cookieStore = await cookies();
        const viewedKey = `viewed_post_${postId}`;

        // Check if already viewed in this session
        if (cookieStore.has(viewedKey)) {
            return { success: true, alreadyCounted: true };
        }

        // Increment in Supabase using the rpc or a direct update
        // We fetch current count first to ensure accuracy if needed, 
        // but a direct incremental update is better if we had an RPC.
        // For now, we'll fetch then update.
        const { data: post, error: fetchError } = await supabaseAdmin
            .from('posts')
            .select('view_count')
            .eq('id', postId)
            .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabaseAdmin
            .from('posts')
            .update({ view_count: (post.view_count || 0) + 1 })
            .eq('id', postId);

        if (updateError) throw updateError;

        // Set cookie to prevent re-counting (12 hours)
        cookieStore.set(viewedKey, 'true', {
            maxAge: 3600 * 12,
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        return { success: true, incremented: true };
    } catch (error) {
        console.error('Error incrementing post view:', error);
        return { success: false, error: error.message };
    }
}

export async function incrementPostLike(postId) {
    if (!postId) return { success: false };

    try {
        const cookieStore = await cookies();
        const likedKey = `liked_post_${postId}`;

        // Check if already liked in this session
        if (cookieStore.has(likedKey)) {
            return { success: true, alreadyLiked: true };
        }

        // Fetch current count
        const { data: post, error: fetchError } = await supabaseAdmin
            .from('posts')
            .select('like_count')
            .eq('id', postId)
            .single();

        if (fetchError) throw fetchError;

        // Increment in Supabase
        const { error: updateError } = await supabaseAdmin
            .from('posts')
            .update({ like_count: (post.like_count || 0) + 1 })
            .eq('id', postId);

        if (updateError) throw updateError;

        // Set cookie to prevent multi-liking (indefinite, or long duration)
        cookieStore.set(likedKey, 'true', {
            maxAge: 3600 * 24 * 365, // 1 year
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        return { success: true, incremented: true };
    } catch (error) {
        console.error('Error incrementing post like:', error);
        return { success: false, error: error.message };
    }
}
