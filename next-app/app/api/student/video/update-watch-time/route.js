import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * POST /api/student/video/update-watch-time
 * Update total watch time for a video (called periodically during playback)
 * 
 * Request body:
 * {
 *   contentId: number,
 *   secondsWatched: number (increment to add)
 * }
 */
export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { contentId, secondsWatched, lastPosition } = await request.json();

        if (!contentId || secondsWatched === undefined) {
            return NextResponse.json(
                { error: 'contentId and secondsWatched are required' },
                { status: 400 }
            );
        }

        // Get member ID
        const { data: member } = await supabase
            .from('members')
            .select('id')
            .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
            .single();

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        // Get current progress
        const { data: progress } = await supabase
            .from('content_progress')
            .select('total_watch_seconds, id')
            .eq('member_id', member.id)
            .eq('content_id', contentId)
            .maybeSingle();

        if (progress) {
            // Update watch time
            const newTotalSeconds = (progress.total_watch_seconds || 0) + secondsWatched;

            const updatePayload = {
                total_watch_seconds: newTotalSeconds,
                updated_at: new Date().toISOString()
            };

            if (lastPosition !== undefined) {
                updatePayload.last_position_seconds = Math.floor(lastPosition);
            }

            const { error } = await supabase
                .from('content_progress')
                .update(updatePayload)
                .eq('id', progress.id);

            if (error) throw error;

            return NextResponse.json({
                success: true,
                totalWatchSeconds: newTotalSeconds
            });
        } else {
            return NextResponse.json(
                { error: 'Progress record not found. Call track-view first.' },
                { status: 404 }
            );
        }

    } catch (error) {
        console.error('Error updating watch time:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
