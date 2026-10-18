import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * POST /api/student/video/track-view
 * Track when a video starts playing (increment view count)
 * 
 * Request body:
 * {
 *   contentId: number,
 *   courseId: number,
 *   chapterId: number,
 *   contentTitle: string
 * }
 */
export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { contentId, courseId, chapterId, contentTitle } = await request.json();

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

        // Get current progress
        const { data: existingProgress } = await supabase
            .from('content_progress')
            .select('view_count, id')
            .eq('member_id', member.id)
            .eq('content_id', contentId)
            .maybeSingle();

        if (existingProgress) {
            // Update view count
            const { error } = await supabase
                .from('content_progress')
                .update({
                    view_count: (existingProgress.view_count || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingProgress.id);

            if (error) throw error;

            return NextResponse.json({
                success: true,
                viewCount: (existingProgress.view_count || 0) + 1
            });
        } else {
            // Create new progress record with view_count = 1
            const { data, error } = await supabase
                .from('content_progress')
                .insert({
                    member_id: member.id,
                    content_id: contentId,
                    course_id: courseId,
                    chapter_id: chapterId,
                    content_type: 'video',
                    content_title: contentTitle,
                    view_count: 1,
                    completed: false,
                    completion_percentage: 0
                })
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({
                success: true,
                viewCount: 1
            });
        }

    } catch (error) {
        console.error('Error tracking video view:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
