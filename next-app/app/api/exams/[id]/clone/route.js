import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
    const { id } = await params;

    try {
        // 1. Fetch the source exam
        const { data: sourceExam, error: fetchError } = await supabaseAdmin
            .from('exams')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !sourceExam) {
            return NextResponse.json({ error: 'Source exam not found' }, { status: 404 });
        }

        // 2. Prepare the new exam data
        // eslint-disable-next-line no-unused-vars
        const { id: _, created_at: __, updated_at: ___, ...examDataWithoutExtras } = sourceExam;

        const newExamData = {
            ...examDataWithoutExtras,
            title: `${sourceExam.title} (Copy)`,
            slug: sourceExam.slug ? `${sourceExam.slug}-copy-${Date.now()}` : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: false // Default copy to inactive
        };

        // 3. Insert the new exam
        const { data: newExam, error: insertError } = await supabaseAdmin
            .from('exams')
            .insert([newExamData])
            .select()
            .single();

        if (insertError) throw insertError;

        // 4. Fetch questions from source exam
        const { data: questions, error: questionsError } = await supabaseAdmin
            .from('exam_questions')
            .select('*')
            .eq('exam_id', id);

        if (questionsError) throw questionsError;

        // 5. Batch insert questions for new exam
        if (questions && questions.length > 0) {
            const newQuestionsData = questions.map(q => {
                // eslint-disable-next-line no-unused-vars
                const { id: ___, exam_id: ____, ...qData } = q;
                return {
                    ...qData,
                    exam_id: newExam.id
                };
            });

            const { error: batchInsertError } = await supabaseAdmin
                .from('exam_questions')
                .insert(newQuestionsData);

            if (batchInsertError) throw batchInsertError;
        }

        return NextResponse.json(newExam);
    } catch (error) {
        console.error('Error cloning exam:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
