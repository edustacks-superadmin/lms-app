import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/courses/[id]/video-stats
 * Get video watch statistics for all students in a course
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const courseId = id;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }



        // Get all students with video progress in this course
        const { data: stats, error } = await supabase
            .from('enrollments')
            .select(`
                member_id,
                members (
                    id,
                    email,
                    name
                )
            `)
            .eq('course_id', courseId)
            .eq('status', 'active');

        if (error) throw error;

        // Get total number of videos in course
        const { count: totalVideos } = await supabase
            .from('chapter_contents')
            .select('*, chapters!inner(course_id)', { count: 'exact', head: true })
            .eq('chapters.course_id', courseId)
            .eq('type', 'video');
        const statsWithProgress = await Promise.all(
            stats.map(async (enrollment) => {
                const memberId = enrollment.member_id;

                // Get total watch time and view counts
                const { data: progress } = await supabase
                    .from('content_progress')
                    .select('view_count, total_watch_seconds, completed')
                    .eq('member_id', memberId)
                    .eq('course_id', courseId)
                    .eq('content_type', 'video');

                const totalViews = progress?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
                const totalWatchSeconds = progress?.reduce((sum, p) => sum + (p.total_watch_seconds || 0), 0) || 0;
                const completedVideos = progress?.filter(p => p.completed).length || 0;



                const progressPercentage = totalVideos > 0
                    ? Math.round((completedVideos / totalVideos) * 100)
                    : 0;

                return {
                    member_id: memberId,
                    email: enrollment.members?.email,
                    name: enrollment.members?.name,
                    total_views: totalViews,
                    total_watch_minutes: Math.round(totalWatchSeconds / 60),
                    completed_videos: completedVideos,
                    total_videos: totalVideos,
                    progress_percentage: progressPercentage
                };
            })
        );

        return NextResponse.json({
            stats: statsWithProgress,
            totalVideos: totalVideos || 0
        });

    } catch (error) {
        console.error('Error fetching video stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/courses/[id]/video-stats/reset
 * Reset video stats for a specific student
 */
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const courseId = id;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { memberId } = await request.json();

        if (!memberId) {
            return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
        }

        // Reset view counts and watch time for this member in this course
        const { error } = await supabase
            .from('content_progress')
            .update({
                view_count: 0,
                total_watch_seconds: 0
            })
            .eq('member_id', memberId)
            .eq('course_id', courseId)
            .eq('content_type', 'video');

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error resetting video stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
