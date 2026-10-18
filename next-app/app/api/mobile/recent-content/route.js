import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('chapter_contents')
            .select(`
                id, 
                title, 
                type, 
                created_at,
                chapters (
                    id, 
                    name,
                    courses (
                        id, 
                        title,
                        image
                    )
                )
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching recent content:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
