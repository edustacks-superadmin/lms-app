import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

export const dynamic = 'force-dynamic';

// PUT - Update a course
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Extract tags separately
        const { tags, course_tags, ...courseData } = body;

        // Update the course
        const { error: courseError } = await supabaseAdmin
            .from('courses')
            .update(courseData)
            .eq('id', parseInt(id));

        if (courseError) {
            console.error('Error updating course:', courseError);
            return NextResponse.json({ error: courseError.message }, { status: 500 });
        }

        // Handle tags if provided
        if (tags !== undefined) {
            // Delete existing tags
            const { error: deleteError } = await supabaseAdmin
                .from('course_tags')
                .delete()
                .eq('course_id', parseInt(id));

            if (deleteError) {
                console.error('Error deleting course tags:', deleteError);
            }

            // Insert new tags
            if (tags && tags.length > 0) {
                const tagInserts = tags.map(tagId => ({
                    course_id: parseInt(id),
                    tag_id: tagId
                }));

                const { error: insertError } = await supabaseAdmin
                    .from('course_tags')
                    .insert(tagInserts);

                if (insertError) {
                    console.error('Error inserting course tags:', insertError);
                    return NextResponse.json({ error: insertError.message }, { status: 500 });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in PUT /api/admin/courses/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET - Get a single course
export async function GET(request, { params }) {
    try {
        const { id } = await params;

        const { data: course, error } = await supabaseAdmin
            .from('courses')
            .select('*')
            .eq('id', parseInt(id))
            .single();

        if (error) {
            console.error('Error fetching course:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch tags
        const { data: tagsData } = await supabaseAdmin
            .from('course_tags')
            .select('tag_id')
            .eq('course_id', parseInt(id));

        return NextResponse.json({
            ...course,
            tags: tagsData ? tagsData.map(t => t.tag_id) : []
        });
    } catch (error) {
        console.error('Error in GET /api/admin/courses/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
