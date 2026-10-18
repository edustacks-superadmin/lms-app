import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);

        if (!courseId) {
            return NextResponse.json({ error: 'Invalid Course ID' }, { status: 400 });
        }

        const { data: chapters, error } = await supabaseAdmin
            .from('chapters')
            .select(`
                *,
                chapter_contents (count)
            `)
            .eq('course_id', courseId)
            .order('order', { ascending: true });

        if (error) {
            console.error('Error fetching chapters:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ chapters });
    } catch (error) {
        console.error('Error in GET /api/admin/courses/[id]/chapters:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
