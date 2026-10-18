import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        // Fetch member with batch associations
        const { data: member, error } = await supabaseAdmin
            .from('members')
            .select(`
                *,
                batch_members(
                    id,
                    batch_id,
                    batches(
                        id,
                        name
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        // Map database fields to UI-friendly format matching UserContext structure
        const enrichedMember = {
            ...member,
            displayName: member.display_name || member.email || 'No Name',
            joinedDate: member.created_at ? new Date(member.created_at).toLocaleDateString('en-GB') : '-',
            batchIds: member.batch_members?.map(bm => bm.batch_id) || [],
            batches: member.batch_members && member.batch_members.length > 0
                ? member.batch_members.map(bm => bm.batches?.name).filter(Boolean).join(', ')
                : null
        };

        return NextResponse.json({ member: enrichedMember });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch member details' },
            { status: 500 }
        );
    }
}
