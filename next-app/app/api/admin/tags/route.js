import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Helper to get user from session
async function getUser() {
    const cookieStore = await cookies();
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// GET - Fetch all tags for an institute
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('institute_id');

        console.log('GET /api/admin/tags - instituteId:', instituteId);
        console.log('Using service role key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'YES' : 'NO (falling back to anon)');

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('tags')
            .select('*')
            .eq('institute_id', parseInt(instituteId))
            .order('name');

        console.log('Tags query result:', { data, error });

        if (error) {
            console.error('Error fetching tags:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ tags: data || [] });
    } catch (error) {
        console.error('Error in GET /api/admin/tags:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create a new tag
export async function POST(request) {
    try {
        const body = await request.json();
        const { name, color, institute_id } = body;

        if (!name || !institute_id) {
            return NextResponse.json({ error: 'Name and institute_id are required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('tags')
            .insert([{
                name,
                color: color || '#2196f3',
                type: body.type || 'all',
                institute_id: parseInt(institute_id)
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating tag:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ tag: data });
    } catch (error) {
        console.error('Error in POST /api/admin/tags:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
