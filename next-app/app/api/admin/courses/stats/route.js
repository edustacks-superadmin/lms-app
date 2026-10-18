import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('institute_id');

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        // Parallelize the queries for performance
        const [
            { count: totalCourses, error: totalError },
            { count: activeCourses, error: activeError },
            { count: archivedCourses, error: archivedError },
            { count: totalLearners, error: learnersError }
        ] = await Promise.all([
            // Total Courses
            supabaseAdmin
                .from('courses')
                .select('*', { count: 'exact', head: true })
                .eq('institute_id', instituteId),

            // Active Courses
            supabaseAdmin
                .from('courses')
                .select('*', { count: 'exact', head: true })
                .eq('institute_id', instituteId)
                .or('is_archived.is.null,is_archived.eq.false'),

            // Archived Courses
            supabaseAdmin
                .from('courses')
                .select('*', { count: 'exact', head: true })
                .eq('institute_id', instituteId)
                .eq('is_archived', true),

            // Total Learners (Enrollments) - We need to filter enrollments by courses of this institute
            // Since we don't have direct institute_id on enrollments usually, we rely on course relation.
            // However, for simplicity/performance in this specific schema context, we might assume counts.
            // But accurate way:
            supabaseAdmin
                .from('enrollments')
                .select('id', { count: 'exact', head: true })
        ]);

        if (totalError || activeError || archivedError) {
            console.error('Error fetching stats:', totalError || activeError || archivedError);
        }

        // Note: Total Learners query above is checking ALL enrollments. 
        // If the system is multi-tenant, we should filter by course.institute_id.
        // Let's refine the learners query to be safe, although simpler is faster.
        // A direct join count is hard with supabase-js 'head:true'.
        // For now, assuming single-tenant or handled by RLS if used on client, but this is admin API.
        // Let's stick to the simple one for now as 'enrollments' likely links to courses. 
        // If we need strict filtering:
        // const { count } = await supabaseAdmin.from('enrollments').select('courses!inner(institute_id)', { count: 'exact', head: true }).eq('courses.institute_id', instituteId);

        // Let's try the safer relational count for learners
        const { count: safeLearnerCount, error: safeLearnerError } = await supabaseAdmin
            .from('enrollments')
            .select('course_id, courses!inner(institute_id)', { count: 'exact', head: true })
            .eq('courses.institute_id', instituteId);

        return NextResponse.json({
            totalCourses: totalCourses || 0,
            activeCourses: activeCourses || 0,
            archivedCourses: archivedCourses || 0,
            totalLearners: safeLearnerCount || 0
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
