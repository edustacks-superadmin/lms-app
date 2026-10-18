import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * POST /api/student/video/check-access
 * Check if student can access a video based on view limits and watch time restrictions
 * 
 * Request body:
 * {
 *   contentId: number,
 *   courseId: number
 * }
 * 
 * Response:
 * {
 *   canAccess: boolean,
 *   reason?: string,
 *   viewsRemaining?: number,
 *   watchTimeRemaining?: number (in seconds)
 * }
 */
export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { contentId, courseId } = await request.json();

        if (!contentId || !courseId) {
            return NextResponse.json(
                { error: 'contentId and courseId are required' },
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

        // Check for admin override
        const { data: override } = await supabase
            .from('member_video_overrides')
            .select('unlimited_views')
            .eq('member_id', member.id)
            .eq('course_id', courseId)
            .single();

        if (override?.unlimited_views) {
            return NextResponse.json({
                canAccess: true,
                reason: 'Admin override - unlimited access'
            });
        }

        // Get course restrictions
        const { data: course } = await supabase
            .from('courses')
            .select('max_video_views, watch_time_multiplier')
            .eq('id', courseId)
            .single();

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        // If no restrictions set, allow access
        if (!course.max_video_views && !course.watch_time_multiplier) {
            return NextResponse.json({ canAccess: true });
        }

        // Get current progress for this content
        const { data: progress } = await supabase
            .from('content_progress')
            .select('view_count, total_watch_seconds')
            .eq('member_id', member.id)
            .eq('content_id', contentId)
            .single();

        const currentViews = progress?.view_count || 0;
        const currentWatchSeconds = progress?.total_watch_seconds || 0;

        // Check view limit (per-video)
        if (course.max_video_views && currentViews >= course.max_video_views) {
            return NextResponse.json({
                canAccess: false,
                reason: 'View limit reached',
                viewsRemaining: 0
            });
        }

        // Check watch time limit (course-level)
        if (course.watch_time_multiplier) {
            // Get total video duration for the course
            const { data: contents } = await supabase
                .from('chapter_contents')
                .select('duration, chapters!inner(course_id)')
                .eq('chapters.course_id', courseId)
                .eq('type', 'video');

            const totalCourseDuration = contents?.reduce((sum, c) => sum + (c.duration || 0), 0) || 0;

            // If we don't know the course duration, we can't enforce a time limit
            // TODO: Implement duration extraction for uploaded videos
            if (totalCourseDuration > 0) {
                const allowedWatchTime = totalCourseDuration * course.watch_time_multiplier;

                // Get total watch time across all videos in the course
                const { data: allProgress } = await supabase
                    .from('content_progress')
                    .select('total_watch_seconds')
                    .eq('member_id', member.id)
                    .eq('course_id', courseId)
                    .eq('content_type', 'video');

                const totalWatched = allProgress?.reduce((sum, p) => sum + (p.total_watch_seconds || 0), 0) || 0;

                if (totalWatched >= allowedWatchTime) {
                    return NextResponse.json({
                        canAccess: false,
                        reason: 'Watch time limit reached',
                        watchTimeRemaining: 0
                    });
                }

                return NextResponse.json({
                    canAccess: true,
                    viewsRemaining: course.max_video_views ? course.max_video_views - currentViews : null,
                    watchTimeRemaining: Math.round(allowedWatchTime - totalWatched)
                });
            } else {
                // Fallback if duration is unknown: allow access but don't show time remaining
                return NextResponse.json({
                    canAccess: true,
                    viewsRemaining: course.max_video_views ? course.max_video_views - currentViews : null,
                    watchTimeRemaining: null
                });
            }
        }

        // Only view limit exists
        return NextResponse.json({
            canAccess: true,
            viewsRemaining: course.max_video_views ? course.max_video_views - currentViews : null
        });

    } catch (error) {
        console.error('Error checking video access:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
