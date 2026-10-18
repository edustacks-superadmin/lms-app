import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Fetch all archived courses for an institute
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('institute_id');

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('courses')
            .select('id, title, image, archived_at, created_at')
            .eq('institute_id', instituteId)
            .eq('is_archived', true)
            .order('archived_at', { ascending: false });

        if (error) {
            console.error('Error fetching archived courses:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ courses: data || [] });
    } catch (error) {
        console.error('Error in GET /api/admin/courses/archived:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Restore a course from archive
export async function POST(request) {
    try {
        const body = await request.json();
        const { courseId, action } = body;

        if (!courseId) {
            return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
        }

        if (action === 'restore') {
            // Restore course
            const { error } = await supabaseAdmin
                .from('courses')
                .update({
                    is_archived: false,
                    archived_at: null
                })
                .eq('id', parseInt(courseId));

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Course restored successfully' });
        } else if (action === 'delete') {
            // Permanently delete course
            const { error } = await supabaseAdmin
                .from('courses')
                .delete()
                .eq('id', parseInt(courseId));

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Course permanently deleted' });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error in POST /api/admin/courses/archived:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
