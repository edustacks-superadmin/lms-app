import { NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';
import { getPlatform } from '@/lib/platform';

/**
 * GET /api/courses
 * 
 * Fetch courses filtered by current platform
 * Only returns courses allowed on the requesting platform
 */
export async function GET(request) {
    try {
        // Detect platform from request
        const currentPlatform = getPlatform(request.headers);

        console.log(`[API /courses] Platform: ${currentPlatform}`);

        // Fetch courses where allowed_platforms contains current platform
        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .contains('allowed_platforms', [currentPlatform])
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching courses:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            courses,
            platform: currentPlatform,
            count: courses.length
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
