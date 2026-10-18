import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const instituteId = searchParams.get('instituteId');

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from('question_folders')
            .select('*', { count: 'exact' });

        if (!instituteId) {
            return NextResponse.json({
                data: [],
                count: 0,
                page,
                totalPages: 0
            });
        }

        query = query.eq('institute_id', instituteId);

        // Apply Search
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        // Apply Pagination & Ordering
        query = query.order('created_at', { ascending: false })
            .range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching question folders:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Need to fetch question counts for these folders efficiently
        // Using a loop for now (Supabase doesn't support convenient subqueries/joins for counts in one go easily via JS client for this specific case without a view/RPC)
        // Alternative: Create a view or RPC. But for 10 items, parallel queries are okay.

        const foldersWithCounts = await Promise.all(
            data.map(async (folder) => {
                const { count: qCount, error: countError } = await supabaseAdmin
                    .from('question_folder_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('folder_id', folder.id);

                return {
                    ...folder,
                    questionCount: countError ? 0 : (qCount || 0)
                };
            })
        );

        return NextResponse.json({
            data: foldersWithCounts,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
