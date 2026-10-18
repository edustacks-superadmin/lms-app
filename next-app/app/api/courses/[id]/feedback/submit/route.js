import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Using regular supabase client for RLS checks (user context)
import { supabaseAdmin } from '@/lib/supabase'; // Admin for writing if RLS is restrictive, or check permissions

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    try {
        const { id } = await params; // course_id
        const courseId = parseInt(id);
        const { form_id, answers } = await request.json(); // answers: { question_id: value }

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get member record for this user to link response
        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('id')
            .eq('email', user.email)
            .single();

        if (memberError || !member) {
            return NextResponse.json({ error: 'Member profile not found' }, { status: 404 });
        }

        // Check if user already submitted (optional restriction, strictly enforced here for now)
        // const { data: existing } = await supabaseAdmin
        //     .from('feedback_responses')
        //     .select('id')
        //     .eq('form_id', form_id)
        //     .eq('user_id', member.id)
        //     .single();
        // if (existing) return NextResponse.json({ error: 'Already submitted' }, { status: 400 });

        // Insert Response
        const { data: response, error: responseError } = await supabaseAdmin
            .from('feedback_responses')
            .insert([{
                form_id: form_id,
                user_id: member.id,
                submitted_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (responseError) {
            console.error('Error creating response:', responseError);
            return NextResponse.json({ error: responseError.message }, { status: 500 });
        }

        // Insert Answers
        const answerInserts = Object.entries(answers).map(([questionId, answerValue]) => ({
            response_id: response.id,
            question_id: parseInt(questionId),
            answer_text: typeof answerValue === 'string' ? answerValue : null,
            rating: typeof answerValue === 'number' ? answerValue : null
        }));

        if (answerInserts.length > 0) {
            const { error: answersError } = await supabaseAdmin
                .from('feedback_answers')
                .insert(answerInserts);

            if (answersError) {
                console.error('Error saving answers:', answersError);
                // Ideally rollback response here or use valid transactions if RPC available
                return NextResponse.json({ error: answersError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error in POST /api/courses/[id]/feedback/submit:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
