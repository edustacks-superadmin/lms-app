import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get all questions for a feedback form
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);

        // Get form id
        const { data: form } = await supabaseAdmin
            .from('course_feedback_forms')
            .select('id')
            .eq('course_id', courseId)
            .single();

        if (!form) {
            return NextResponse.json({ error: 'Feedback form not found' }, { status: 404 });
        }

        const { data: questions, error } = await supabaseAdmin
            .from('feedback_questions')
            .select('*')
            .eq('form_id', form.id)
            .order('order_index');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ questions: questions || [] });
    } catch (error) {
        console.error('Error in GET /api/admin/courses/[id]/feedback/questions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Add a new question
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);
        const body = await request.json();
        const { question_type, question_text, is_required } = body;

        if (!question_text) {
            return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
        }

        // Get form id
        const { data: form } = await supabaseAdmin
            .from('course_feedback_forms')
            .select('id')
            .eq('course_id', courseId)
            .single();

        if (!form) {
            return NextResponse.json({ error: 'Feedback form not found' }, { status: 404 });
        }

        // Get max order_index
        const { data: maxOrder } = await supabaseAdmin
            .from('feedback_questions')
            .select('order_index')
            .eq('form_id', form.id)
            .order('order_index', { ascending: false })
            .limit(1)
            .single();

        const newOrderIndex = (maxOrder?.order_index || 0) + 1;

        const { data, error } = await supabaseAdmin
            .from('feedback_questions')
            .insert([{
                form_id: form.id,
                question_type: question_type || 'rating',
                question_text,
                is_required: is_required || false,
                order_index: newOrderIndex
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding question:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ question: data });
    } catch (error) {
        console.error('Error in POST /api/admin/courses/[id]/feedback/questions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update question
export async function PUT(request, { params }) {
    try {
        const body = await request.json();
        const { question_id, question_type, question_text, is_required, order_index } = body;

        if (!question_id) {
            return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
        }

        const updateData = {};
        if (question_type !== undefined) updateData.question_type = question_type;
        if (question_text !== undefined) updateData.question_text = question_text;
        if (is_required !== undefined) updateData.is_required = is_required;
        if (order_index !== undefined) updateData.order_index = order_index;

        const { data, error } = await supabaseAdmin
            .from('feedback_questions')
            .update(updateData)
            .eq('id', question_id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ question: data });
    } catch (error) {
        console.error('Error in PUT /api/admin/courses/[id]/feedback/questions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Remove question
export async function DELETE(request, { params }) {
    try {
        const { searchParams } = new URL(request.url);
        const questionId = searchParams.get('question_id');

        if (!questionId) {
            return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('feedback_questions')
            .delete()
            .eq('id', parseInt(questionId));

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/admin/courses/[id]/feedback/questions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
