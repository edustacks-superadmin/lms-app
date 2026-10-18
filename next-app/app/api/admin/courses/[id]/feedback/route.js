import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get feedback form for a course (create if doesn't exist)
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);

        // Get course info
        const { data: course } = await supabaseAdmin
            .from('courses')
            .select('id, title, institute_id')
            .eq('id', courseId)
            .single();

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        // Get or create feedback form
        let { data: form, error } = await supabaseAdmin
            .from('course_feedback_forms')
            .select(`
                *,
                feedback_questions (
                    id,
                    question_type,
                    question_text,
                    is_required,
                    order_index
                )
            `)
            .eq('course_id', courseId)
            .single();

        // Create form if doesn't exist
        if (!form) {
            const { data: newForm, error: createError } = await supabaseAdmin
                .from('course_feedback_forms')
                .insert([{
                    course_id: courseId,
                    name: `${course.title} | Feedback Form`,
                    is_enabled: false,
                    trigger_type: 'completion',
                    trigger_config: { min_percentage: 95 },
                    institute_id: course.institute_id
                }])
                .select()
                .single();

            if (createError) {
                console.error('Error creating feedback form:', createError);
                return NextResponse.json({ error: createError.message }, { status: 500 });
            }

            form = { ...newForm, feedback_questions: [] };
        }

        // Sort questions by order_index
        if (form.feedback_questions) {
            form.feedback_questions.sort((a, b) => a.order_index - b.order_index);
        }

        return NextResponse.json({ form, course });
    } catch (error) {
        console.error('Error in GET /api/admin/courses/[id]/feedback:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update feedback form settings
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);
        const body = await request.json();

        const { is_enabled, name, trigger_type, trigger_config } = body;

        const updateData = {};
        if (is_enabled !== undefined) updateData.is_enabled = is_enabled;
        if (name !== undefined) updateData.name = name;
        if (trigger_type !== undefined) updateData.trigger_type = trigger_type;
        if (trigger_config !== undefined) updateData.trigger_config = trigger_config;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('course_feedback_forms')
            .update(updateData)
            .eq('course_id', courseId)
            .select()
            .single();

        if (error) {
            console.error('Error updating feedback form:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ form: data });
    } catch (error) {
        console.error('Error in PUT /api/admin/courses/[id]/feedback:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
