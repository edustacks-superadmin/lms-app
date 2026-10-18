import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);
        const { title, institute_id } = await request.json();

        if (!courseId) {
            return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
        }

        // 1. Fetch original course
        const { data: originalCourse, error: courseError } = await supabaseAdmin
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();

        if (courseError || !originalCourse) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        // 2. Create new course
        // eslint-disable-next-line no-unused-vars
        const { id: _id, created_at: _created, updated_at: _updated, testpress_id: _tpid, ...courseDataStr } = originalCourse;

        const newCourseData = {
            ...courseDataStr,
            title: title || `Copy of ${originalCourse.title}`,
            institute_id: institute_id || originalCourse.institute_id
        };

        const { data: newCourse, error: createError } = await supabaseAdmin
            .from('courses')
            .insert([newCourseData])
            .select()
            .single();

        if (createError) {
            console.error('Error creating new course:', createError);
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        // 3. Fetch chapters and contents
        const { data: chapters, error: chaptersError } = await supabaseAdmin
            .from('chapters')
            .select(`
                *,
                chapter_contents (*)
            `)
            .eq('course_id', courseId)
            .order('order', { ascending: true });

        if (chaptersError) {
            console.error('Error fetching chapters:', chaptersError);
            // Even if fetching chapters fails, we return the new course, maybe with a warning? 
            // Better to fail properly or continue best effort.
            return NextResponse.json({ course: newCourse, warning: 'Failed to clone chapters' });
        }

        // 4. Clone Chapters and Contents
        if (chapters && chapters.length > 0) {
            // We'll do this sequentially to maintain order and avoid race conditions/complexity
            for (const chapter of chapters) {
                // eslint-disable-next-line no-unused-vars
                const { id: _cid, created_at: _cca, updated_at: _cua, testpress_id: _ctpid, chapter_contents, ...chapterDataStr } = chapter;

                const newChapterData = {
                    ...chapterDataStr,
                    course_id: newCourse.id
                };

                const { data: newChapter, error: newChapterError } = await supabaseAdmin
                    .from('chapters')
                    .insert([newChapterData])
                    .select()
                    .single();

                if (!newChapterError && newChapter && chapter_contents) {
                    const contentsToInsert = chapter_contents.map(content => {
                        // eslint-disable-next-line no-unused-vars
                        const { id: _coid, created_at: _coca, updated_at: _coua, testpress_id: _cotpid, ...contentDataStr } = content;
                        return {
                            ...contentDataStr,
                            chapter_id: newChapter.id
                        };
                    });

                    if (contentsToInsert.length > 0) {
                        await supabaseAdmin
                            .from('chapter_contents')
                            .insert(contentsToInsert);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            course: newCourse,
            message: 'Course cloned successfully'
        });

    } catch (error) {
        console.error('Error cloning course:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
