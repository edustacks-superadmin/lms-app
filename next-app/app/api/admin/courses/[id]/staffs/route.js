import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Fetch all staff assigned to a course
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);

        const { data, error } = await supabaseAdmin
            .from('course_staff')
            .select(`
                id,
                role,
                created_at,
                member_id,
                members (
                    id,
                    first_name,
                    last_name,
                    email,
                    photo_url,
                    role
                )
            `)
            .eq('course_id', courseId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching course staff:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ staff: data || [] });
    } catch (error) {
        console.error('Error in GET /api/admin/courses/[id]/staffs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Add a staff member to a course
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);
        const body = await request.json();
        const { member_id, role = 'staff' } = body;

        if (!member_id) {
            return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
        }

        // Check if already assigned
        const { data: existing } = await supabaseAdmin
            .from('course_staff')
            .select('id')
            .eq('course_id', courseId)
            .eq('member_id', member_id)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'This member is already assigned to this course' }, { status: 400 });
        }

        // Get institute_id from the course
        const { data: course } = await supabaseAdmin
            .from('courses')
            .select('institute_id')
            .eq('id', courseId)
            .single();

        const { data, error } = await supabaseAdmin
            .from('course_staff')
            .insert([{
                course_id: courseId,
                member_id: parseInt(member_id),
                role,
                institute_id: course?.institute_id || 10
            }])
            .select(`
                id,
                role,
                created_at,
                member_id,
                members (
                    id,
                    first_name,
                    last_name,
                    email,
                    photo_url,
                    role
                )
            `)
            .single();

        if (error) {
            console.error('Error adding course staff:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ staff: data });
    } catch (error) {
        console.error('Error in POST /api/admin/courses/[id]/staffs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Remove a staff member from a course
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);
        const { searchParams } = new URL(request.url);
        const staffId = searchParams.get('staff_id');

        if (!staffId) {
            return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('course_staff')
            .delete()
            .eq('id', parseInt(staffId))
            .eq('course_id', courseId);

        if (error) {
            console.error('Error removing course staff:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/admin/courses/[id]/staffs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
