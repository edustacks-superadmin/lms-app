import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
        }

        // Fetch the question with subject
        const { data: question, error: questionError } = await supabaseAdmin
            .from('questions')
            .select('*, subjects(name, parent_id)')
            .eq('id', id)
            .single();

        if (questionError) {
            console.error('Error fetching question:', questionError);
            return NextResponse.json({ error: questionError.message }, { status: 500 });
        }

        if (!question) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        // Fetch options, tags in parallel
        const [optionsResult, tagsResult] = await Promise.all([
            supabaseAdmin.from('question_options').select('*').eq('question_id', id),
            supabaseAdmin.from('question_tags').select('*').eq('question_id', id)
        ]);

        // Sort options by label
        const options = (optionsResult.data || []).sort((a, b) =>
            (a.option_label || '').localeCompare(b.option_label || '')
        );

        // Combine data
        const result = {
            ...question,
            options,
            tags: tagsResult.data || []
        };

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (err) {
        console.error('API Server Error:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { questionData, options, tags } = body;

        if (!id) return NextResponse.json({ error: 'Question ID required' }, { status: 400 });

        // 1. Update Question
        const { error: matchError } = await supabaseAdmin
            .from('questions')
            .update({
                ...questionData,
                updated_at: new Date()
            })
            .eq('id', id);

        if (matchError) throw matchError;

        // 2. Upsert Options
        // Ensure question_id is present
        const optionsWithId = options.map(opt => ({
            ...opt,
            question_id: id
        }));

        const { error: optError } = await supabaseAdmin
            .from('question_options')
            .upsert(optionsWithId);

        if (optError) throw optError;

        // 3. Update Tags (Delete & Re-insert as tags are simple strings)
        await supabaseAdmin.from('question_tags').delete().eq('question_id', id);

        if (tags && tags.length > 0) {
            const tagRows = tags.map(t => ({
                question_id: id,
                tag_name: t
            }));
            const { error: tagError } = await supabaseAdmin
                .from('question_tags')
                .insert(tagRows);

            if (tagError) throw tagError;
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('API Update Error:', err);
        return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
    }
}
