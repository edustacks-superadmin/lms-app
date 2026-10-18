import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'running';
        const page = parseInt(searchParams.get('page')) || 1;
        const search = searchParams.get('search') || '';
        const instituteId = searchParams.get('instituteId');
        const pageSize = 20;

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const courseId = searchParams.get('courseId');

        // Build base query to fetch courses from all three possible sources:
        // 1. Join table: course_exams
        // 2. Direct FK: course_id
        // 3. Via chapters: chapter_contents -> chapters -> courses
        let selectQuery = `
            *,
            course_exams(courses(id, title)),
            courses(id, title),
            chapter_contents(chapters(courses(id, title)))
        `.replace(/\s+/g, ' ').trim();

        let query = supabaseAdmin
            .from('exams')
            .select(selectQuery, { count: 'exact' });

        // Apply search filter if provided
        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Filter by status based on dates
        const now = new Date().toISOString();

        // Filter by institute
        if (instituteId) {
            query = query.eq('institute_id', instituteId);
        }

        // Filter by course - improved to check multiple sources if possible
        // Note: Complex OR across relations might have performance implications or limitations
        if (courseId) {
            // For now, if courseId is provided, we filter by the most common way (course_exams and direct FK)
            // Filtering by chapter_contents deeply nested is complex in a single OR.
            // We prioritize the direct course_id and course_exams.
            query = query.or(`course_id.eq.${courseId},course_exams.course_id.eq.${courseId}`);
        }

        // Filter by tags
        const tagIds = searchParams.get('tags');
        if (tagIds) {
            const tagsArray = tagIds.split(',');
            const { data: tagMatches, error: tagError } = await supabaseAdmin
                .from('exam_tags')
                .select('exam_id')
                .in('tag_id', tagsArray);

            if (!tagError && tagMatches) {
                const validExamIds = tagMatches.map(t => t.exam_id);
                if (validExamIds.length === 0) {
                    return NextResponse.json({
                        exams: [],
                        pagination: {
                            currentPage: 1, pageSize, totalCount: 0, totalPages: 0, hasNext: false, hasPrev: false
                        }
                    });
                }
                query = query.in('id', validExamIds);
            }
        }

        if (status === 'running') {
            query = query
                .lte('start_date', now)
                .or(`end_date.gte.${now},end_date.is.null`);
        } else if (status === 'upcoming') {
            query = query.gt('start_date', now);
        } else if (status === 'completed') {
            query = query
                .not('end_date', 'is', null)
                .lt('end_date', now);
        }

        // Apply pagination and ordering
        const { data: rawExams, error, count } = await query
            .range(from, to)
            .order('start_date', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Post-process exams to consolidate course information
        const exams = (rawExams || []).map(exam => {
            const courseMap = new Map();

            // 1. From course_exams (join table)
            if (exam.course_exams) {
                exam.course_exams.forEach(ce => {
                    if (ce.courses) courseMap.set(ce.courses.id, ce.courses);
                });
            }

            // 2. From direct course_id FK
            if (exam.courses) {
                courseMap.set(exam.courses.id, exam.courses);
            }

            // 3. From chapter_contents (exams associated with chapters)
            if (exam.chapter_contents) {
                exam.chapter_contents.forEach(cc => {
                    if (cc.chapters?.courses) {
                        courseMap.set(cc.chapters.courses.id, cc.chapters.courses);
                    }
                });
            }

            // Consolidate into the format the frontend expects: course_exams array
            return {
                ...exam,
                course_exams: Array.from(courseMap.values()).map(course => ({
                    courses: course,
                    course_id: course.id
                }))
            };
        });

        // Fetch attempt counts for each exam in the current page
        const examIds = exams.map(e => e.id);
        if (examIds.length > 0) {
            const { data: countsData, error: countsError } = await supabaseAdmin
                .from('exam_attempts')
                .select('exam_id')
                .in('exam_id', examIds);

            if (!countsError && countsData) {
                const countsMap = countsData.reduce((acc, curr) => {
                    acc[curr.exam_id] = (acc[curr.exam_id] || 0) + 1;
                    return acc;
                }, {});

                exams.forEach(e => {
                    e.attempts_count = countsMap[e.id] || 0;
                });
            }
        }

        const totalPages = Math.ceil((count || 0) / pageSize);

        return NextResponse.json({
            exams,
            pagination: {
                currentPage: page,
                pageSize,
                totalCount: count || 0,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch exams' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { tags, ...examData } = body;

        // Ensure institute_id is present
        if (!examData.institute_id) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('exams')
            .insert([examData])
            .select()
            .single();

        if (error) {
            console.error('Database error (create exam):', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (tags && tags.length > 0) {
            const tagRows = tags.map(tagId => ({
                exam_id: data.id,
                tag_id: tagId,
                institute_id: examData.institute_id
            }));
            const { error: tagError } = await supabaseAdmin.from('exam_tags').insert(tagRows);
            if (tagError) console.error('Error inserting tags:', tagError);
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('API error (create exam):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
