import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Fetch all staff/mentor members available for assignment
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('institute_id');
        const search = searchParams.get('search') || '';

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        let query = supabaseAdmin
            .from('members')
            .select('id, first_name, last_name, email, photo_url, role')
            .in('role', ['staff', 'mentor', 'admin']) // Only staff-level roles
            .eq('institute_id', parseInt(instituteId))
            .eq('is_active', true)
            .order('first_name');

        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, error } = await query.limit(50);

        if (error) {
            console.error('Error fetching staff members:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ members: data || [] });
    } catch (error) {
        console.error('Error in GET /api/admin/members/staff:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
