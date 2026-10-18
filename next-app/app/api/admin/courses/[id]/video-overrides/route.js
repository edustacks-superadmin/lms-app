import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/courses/[id]/video-overrides
 * Get list of students with unlimited video access override
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



        const { data, error } = await supabase
            .from('member_video_overrides')
            .select(`
                id,
                member_id,
                unlimited_views,
                notes,
                created_at,
                members (
                    email,
                    name
                )
            `)
            .eq('course_id', courseId);

        if (error) throw error;

        return NextResponse.json({ overrides: data });

    } catch (error) {
        console.error('Error fetching video overrides:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/courses/[id]/video-overrides
 * Grant unlimited video access to a student
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

        const { memberId, notes } = await request.json();

        if (!memberId) {
            return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
        }

        // Create or update override
        const { data, error } = await supabase
            .from('member_video_overrides')
            .upsert({
                member_id: memberId,
                course_id: courseId,
                unlimited_views: true,
                notes: notes || null,
                created_by_auth_id: user.id,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'member_id,course_id'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, override: data });

    } catch (error) {
        console.error('Error creating video override:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/courses/[id]/video-overrides/[overrideId]
 * Remove unlimited access override
 */
export async function DELETE(request, { params }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const overrideId = searchParams.get('overrideId');

        if (!overrideId) {
            return NextResponse.json({ error: 'overrideId is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('member_video_overrides')
            .delete()
            .eq('id', overrideId);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting video override:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
