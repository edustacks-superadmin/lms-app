import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, auth_uid } = body;

        if (!email || !auth_uid) {
            return NextResponse.json({ error: 'Missing email or auth_uid' }, { status: 400 });
        }

        console.log(`[FixMember] Attempting to link ${email} to ${auth_uid}`);

        // 1. Find Member
        const { data: member, error: findError } = await supabaseAdmin
            .from('members')
            .select('id, auth_user_id')
            .eq('email', email)
            .single();

        if (findError || !member) {
            console.error('[FixMember] Member not found:', findError);
            return NextResponse.json({ error: 'Member not found', details: findError }, { status: 404 });
        }

        console.log('[FixMember] Found member:', member);

        // 2. Update auth_user_id
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('members')
            .update({ auth_user_id: auth_uid })
            .eq('id', member.id)
            .select()
            .single();

        if (updateError) {
            console.error('[FixMember] Update failed:', updateError);
            return NextResponse.json({ error: 'Update failed', details: updateError }, { status: 500 });
        }

        console.log('[FixMember] Success:', updated);
        return NextResponse.json({ success: true, member: updated });

    } catch (error) {
        console.error('[FixMember] Exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
