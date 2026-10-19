import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { updates } = body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: 'Updates array is required' }, { status: 400 });
        }

        const updatePromises = updates.map(({ id, order }) =>
            supabaseAdmin
                .from('courses')
                .update({ order: parseInt(order) })
                .eq('id', parseInt(id))
        );

        const results = await Promise.all(updatePromises);
        const hasError = results.find(r => r.error);
        if (hasError) {
            console.error('Error updating course order in batch:', hasError.error);
            return NextResponse.json({ error: hasError.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: updates.length });
    } catch (error) {
        console.error('Error in /api/admin/courses/reorder:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
