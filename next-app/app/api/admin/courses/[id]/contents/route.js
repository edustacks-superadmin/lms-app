import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get all contents for a course (for dropdown selection)
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);

        // Fetch contents linked to chapters of this course
        const { data: contents, error } = await supabaseAdmin
            .from('chapter_contents')
            .select(`
                id,
                title,
                type,
                chapter_id,
                chapters!inner (
                    id,
                    name,
                    course_id
                )
            `)
            .eq('chapters.course_id', courseId)
            .order('title');

        if (error) {
            console.error('Error fetching course contents:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ contents: contents || [] });
    } catch (error) {
        console.error('Error in GET /api/admin/courses/[id]/contents:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
