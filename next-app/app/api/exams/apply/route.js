import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { validateMemberProfile } from '@/lib/profile';

export async function POST(request) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { exam_tag } = body;

        if (!exam_tag) {
            return NextResponse.json({ error: 'Exam Tag is required' }, { status: 400 });
        }

        // 1. Fetch & Validate Member Profile (Gatekeeper Check)
        const validation = await validateMemberProfile(supabase, user.id);

        if (!validation.valid) {
            return NextResponse.json({
                error: validation.error,
                requires_action: validation.requires_action,
                missing_fields: validation.missing_fields
            }, { status: validation.status });
        }

        const memberId = validation.memberId;

        // 3. Check for Existing Application
        const { data: existingApp } = await supabase
            .from('exam_applications')
            .select('id, status')
            .eq('member_id', memberId)
            .eq('exam_tag', exam_tag)
            .single();

        if (existingApp) {
            return NextResponse.json({
                message: 'Already applied',
                application: existingApp
            }, { status: 200 });
        }

        // 4. Create Application (Stage 1)
        const { data: newApp, error: createError } = await supabase
            .from('exam_applications')
            .insert({
                member_id: memberId,
                exam_tag: exam_tag,
                status: 'applied'
            })
            .select()
            .single();

        if (createError) {
            console.error('Application Error:', createError);
            return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
        }

        return NextResponse.json({
            status: 'success',
            message: 'Application Submitted',
            application: newApp
        }, { status: 201 });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
