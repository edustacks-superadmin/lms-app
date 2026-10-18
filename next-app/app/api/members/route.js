import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role') || 'student';
        const page = parseInt(searchParams.get('page')) || 1;
        const search = searchParams.get('search') || '';
        const batchId = searchParams.get('batch') || '';
        const instituteId = searchParams.get('instituteId');
        const pageSize = 20;

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Build base query for members
        let query = supabaseAdmin
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
            `, { count: 'exact' });

        // Filter by institute
        if (instituteId) {
            query = query.eq('institute_id', instituteId);
        }

        // Filter by role
        if (role !== 'all') {
            if (role === 'inactive') {
                query = query.eq('is_active', false);
            } else if (role === 'invited') {
                query = query.eq('status', 'invited');
            } else {
                query = query.eq('role', role);
            }
        }

        // Apply search filter if provided
        if (search) {
            query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%,phone_number.ilike.%${search}%`);
        }

        // Filter by batch if provided
        if (batchId) {
            // This requires filtering through the relationship
            let batchQuery = supabaseAdmin
                .from('batch_members')
                .select('member_id')
                .eq('batch_id', batchId);

            if (instituteId) {
                batchQuery = batchQuery.eq('institute_id', instituteId);
            }

            const { data: batchMembers } = await batchQuery;

            if (batchMembers && batchMembers.length > 0) {
                const memberIds = batchMembers.map(bm => bm.member_id);
                query = query.in('id', memberIds);
            } else {
                // No members in this batch
                return NextResponse.json({
                    members: [],
                    pagination: {
                        currentPage: page,
                        pageSize,
                        totalCount: 0,
                        totalPages: 0,
                        hasNext: false,
                        hasPrev: false
                    }
                });
            }
        }

        // Apply pagination and ordering
        const { data: members, error, count } = await query
            .range(from, to)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Map database fields to UI-friendly names
        const mappedMembers = (members || []).map(member => ({
            ...member,
            displayName: member.display_name || member.email || 'No Name',
            joinedDate: member.created_at ? new Date(member.created_at).toLocaleDateString('en-GB') : '-',
            batches: member.batch_members && member.batch_members.length > 0
                ? member.batch_members.map(bm => bm.batches?.name).filter(Boolean).join(', ')
                : null
        }));

        const totalPages = Math.ceil((count || 0) / pageSize);

        return NextResponse.json({
            members: mappedMembers,
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
            { error: 'Failed to fetch members' },
            { status: 500 }
        );
    }
}
