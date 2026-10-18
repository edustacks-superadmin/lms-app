import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * PUT /api/admin/courses/[id]/video-restrictions
 * Update video restriction settings for a course
 */
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const courseId = id;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('PUT /video-restrictions: User unauthorized');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { maxVideoViews, watchTimeMultiplier } = await request.json();

        // Validate inputs
        if (maxVideoViews !== null && (maxVideoViews < 0 || !Number.isInteger(maxVideoViews))) {
            return NextResponse.json(
                { error: 'maxVideoViews must be a positive integer or null' },
                { status: 400 }
            );
        }

        if (watchTimeMultiplier !== null && (watchTimeMultiplier < 0 || watchTimeMultiplier > 10)) {
            return NextResponse.json(
                { error: 'watchTimeMultiplier must be between 0 and 10 or null' },
                { status: 400 }
            );
        }

        // Update course restrictions
        const { error } = await supabase
            .from('courses')
            .update({
                max_video_views: maxVideoViews,
                watch_time_multiplier: watchTimeMultiplier
            })
            .eq('id', courseId);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating video restrictions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/courses/[id]/video-restrictions
 * Get current video restriction settings
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const courseId = id;
        const supabase = await createClient();



        const { data, error } = await supabase
            .from('courses')
            .select('max_video_views, watch_time_multiplier')
            .eq('id', courseId)
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching video restrictions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
