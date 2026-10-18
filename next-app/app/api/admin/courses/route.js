import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const instituteId = searchParams.get('institute_id');
        const tagsParam = searchParams.get('tags'); // comma-separated tag IDs
        const archivedParam = searchParams.get('archived'); // 'true', 'false', or 'all'

        console.log(`API/courses: Search term: '${search}', Institute: ${instituteId}, Tags: ${tagsParam}, Archived: ${archivedParam}`);

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // If tags filter is provided, first find course IDs that have those tags
        let filteredCourseIds = null;
        if (tagsParam) {
            const tagIds = tagsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            if (tagIds.length > 0) {
                const { data: taggedCourses, error: tagError } = await supabaseAdmin
                    .from('course_tags')
                    .select('course_id')
                    .in('tag_id', tagIds);

                if (tagError) {
                    console.error('Error fetching tagged courses:', tagError);
                } else {
                    // Get unique course IDs that have any of the selected tags
                    filteredCourseIds = [...new Set(taggedCourses.map(tc => tc.course_id))];
                    console.log(`API/courses: Found ${filteredCourseIds.length} courses with selected tags`);
                }
            }
        }

        let query = supabaseAdmin
            .from('courses')
            .select('*, chapters(count), enrollments(count)', { count: 'exact' })
            .eq('institute_id', instituteId);

        // Apply archived filter
        // Default: show only non-archived courses
        // archived=true: show only archived courses
        // archived=all: show all courses regardless of archived status
        if (archivedParam === 'true') {
            query = query.eq('is_archived', true);
        } else if (archivedParam !== 'all') {
            // Default: show only non-archived (or where is_archived is null for backward compatibility)
            query = query.or('is_archived.is.null,is_archived.eq.false');
        }

        // Apply tag filter if provided
        if (filteredCourseIds !== null) {
            if (filteredCourseIds.length === 0) {
                // No courses match the tag filter, return empty result
                return NextResponse.json({
                    data: [],
                    count: 0,
                    page,
                    totalPages: 0
                });
            }
            query = query.in('id', filteredCourseIds);
        }

        // Apply Search
        if (search) {
            // Search in title or description (subtitle column does not exist)
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Apply Pagination & Ordering
        // Order by 'order' field first (for drag-drop), then by created_at descending
        query = query
            .order('order', { ascending: true })
            .order('created_at', { ascending: false })
            .range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching courses:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch tags manually for the fetched courses to avoid JOIN issues
        let enrichedData = data || [];
        if (enrichedData.length > 0) {
            const courseIds = enrichedData.map(c => c.id);
            const { data: tagsData, error: tagsError } = await supabaseAdmin
                .from('course_tags')
                .select('course_id, tag_id')
                .in('course_id', courseIds);

            if (!tagsError && tagsData) {
                // Create a map for faster lookup
                const tagsMap = {};
                tagsData.forEach(item => {
                    if (!tagsMap[item.course_id]) {
                        tagsMap[item.course_id] = [];
                    }
                    tagsMap[item.course_id].push({ tag_id: item.tag_id });
                });

                // Merge tags and counts into course data
                enrichedData = enrichedData.map(course => ({
                    ...course,
                    course_tags: tagsMap[course.id] || [],
                    chapters_count: course.chapters ? course.chapters[0]?.count : 0,
                    learners: course.enrollments ? course.enrollments[0]?.count : 0
                }));
            } else {
                // Even if tags fail or are empty, we still need to flatten counts
                enrichedData = enrichedData.map(course => ({
                    ...course,
                    chapters_count: course.chapters ? course.chapters[0]?.count : 0,
                    learners: course.enrollments ? course.enrollments[0]?.count : 0
                }));
            }
        }

        return NextResponse.json({
            data: enrichedData,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
