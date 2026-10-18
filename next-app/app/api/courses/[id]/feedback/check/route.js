import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { id } = await params; // course_id
        const courseId = parseInt(id);

        // 1. Authenticate User
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ should_trigger: false }); // Silent fail for check
        }

        // Get member
        const { data: member } = await supabaseAdmin
            .from('members')
            .select('id')
            .eq('email', user.email)
            .single();

        if (!member) return NextResponse.json({ should_trigger: false });

        // 2. Get Feedback Form
        const { data: form, error: formError } = await supabaseAdmin
            .from('course_feedback_forms')
            .select(`
                *,
                feedback_questions (*)
            `)
            .eq('course_id', courseId)
            .eq('is_enabled', true)
            .single();

        if (formError || !form) {
            return NextResponse.json({ should_trigger: false });
        }

        // 3. Check if already submitted
        const { data: existing } = await supabaseAdmin
            .from('feedback_responses')
            .select('id')
            .eq('form_id', form.id)
            .eq('user_id', member.id)
            .single();

        if (existing) {
            return NextResponse.json({ should_trigger: false, already_submitted: true });
        }

        // 4. Evaluate Trigger
        let shouldTrigger = false;
        const config = form.trigger_config || {};

        switch (form.trigger_type) {
            case 'completion':
                // Check course completion %
                // We'll calculate roughly by counting completed content vs total content
                // Or use the RPC if accessible
                const { data: progressData, error: rpcError } = await supabaseAdmin
                    .rpc('calculate_course_progress', {
                        p_student_id: member.id,
                        p_course_id: courseId
                    });

                if (!rpcError && progressData !== null) {
                    if (progressData >= (config.min_percentage || 100)) {
                        shouldTrigger = true;
                    }
                }
                break;

            case 'content':
                // Check specific content completion
                if (config.content_id) {
                    const { data: contentData } = await supabaseAdmin
                        .from('content_progress')
                        .select('completed')
                        .eq('student_id', member.id)
                        .eq('content_id', config.content_id)
                        .eq('completed', true)
                        .single();

                    if (contentData) shouldTrigger = true;
                }
                break;

            case 'attendance':
                // Check distinct days active (based on content progress)
                const { data: activeDays } = await supabaseAdmin
                    .from('content_progress')
                    .select('updated_at')
                    .eq('student_id', member.id)
                    .eq('course_id', courseId);

                if (activeDays) {
                    const uniqueDays = new Set(activeDays.map(d => new Date(d.updated_at).toDateString())).size;
                    if (uniqueDays >= (config.min_days || 1)) {
                        shouldTrigger = true;
                    }
                }
                break;

            case 'scheduled':
                // Check date range
                const now = new Date();
                const start = config.start_date ? new Date(config.start_date) : null;
                const end = config.end_date ? new Date(config.end_date) : null;

                if (start && end) {
                    shouldTrigger = now >= start && now <= end;
                } else if (start) {
                    shouldTrigger = now >= start;
                } else if (end) {
                    shouldTrigger = now <= end;
                }
                break;

            case 'content_count':
                // Check count of completed items
                const { count } = await supabaseAdmin
                    .from('content_progress')
                    .select('*', { count: 'exact', head: true })
                    .eq('student_id', member.id)
                    .eq('course_id', courseId)
                    .eq('completed', true);

                if (count >= (config.content_count || 1)) {
                    shouldTrigger = true;
                }
                break;

            default:
                break;
        }

        if (shouldTrigger) {
            // Sort questions
            form.feedback_questions.sort((a, b) => a.order_index - b.order_index);

            return NextResponse.json({
                should_trigger: true,
                form: {
                    id: form.id,
                    name: form.name,
                    questions: form.feedback_questions
                }
            });
        }

        return NextResponse.json({ should_trigger: false });

    } catch (error) {
        console.error('Error in GET /api/courses/[id]/feedback/check:', error);
        return NextResponse.json({ should_trigger: false, error: 'Internal error' });
    }
}
