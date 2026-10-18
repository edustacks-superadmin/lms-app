import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

// PUT - Update a tag
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, color, type } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('tags')
            .update({
                name,
                color,
                type,
                updated_at: new Date().toISOString()
            })
            .eq('id', parseInt(id))
            .select()
            .single();

        if (error) {
            console.error('Error updating tag:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ tag: data });
    } catch (error) {
        console.error('Error in PUT /api/admin/tags/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete a tag
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        const { error } = await supabaseAdmin
            .from('tags')
            .delete()
            .eq('id', parseInt(id));

        if (error) {
            console.error('Error deleting tag:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/admin/tags/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
