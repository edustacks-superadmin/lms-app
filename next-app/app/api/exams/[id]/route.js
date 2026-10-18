import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { tags, ...examData } = body;

        // Update Exam
        const { data: updatedExam, error: examError } = await supabaseAdmin
            .from('exams')
            .update(examData)
            .eq('id', id)
            .select()
            .single();

        if (examError) {
            console.error('Database error (update exam):', examError);
            return NextResponse.json({ error: examError.message }, { status: 500 });
        }

        // Update Tags
        if (tags !== undefined) {
            // Delete existing tags
            const { error: deleteError } = await supabaseAdmin
                .from('exam_tags')
                .delete()
                .eq('exam_id', id);

            if (deleteError) {
                console.error('Error deleting tags:', deleteError);
                // Continue to insert? Or fail? Best to continue if possible or log.
            }

            if (tags.length > 0) {
                // We need institute_id. Check if it's in body, if not, use the exam's institute_id (which might strictly be updatedExam.institute_id)
                const instituteId = examData.institute_id || updatedExam.institute_id;

                const tagRows = tags.map(tagId => ({
                    exam_id: id,
                    tag_id: tagId,
                    institute_id: instituteId
                }));

                const { error: insertError } = await supabaseAdmin
                    .from('exam_tags')
                    .insert(tagRows);

                if (insertError) {
                    console.error('Error inserting tags:', insertError);
                }
            }
        }

        return NextResponse.json(updatedExam);
    } catch (error) {
        console.error('API error (update exam):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
