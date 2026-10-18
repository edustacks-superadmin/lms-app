import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = 'force-dynamic';

// GET /api/folders/[id]/questions - Get questions for a specific folder
export async function GET(request, { params }) {
    try {
        const { id: folderId } = await params;
        const { searchParams } = new URL(request.url);

        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 200;
        const search = searchParams.get('search') || '';

        if (!folderId) {
            return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
        }

        // First get the folder details
        const { data: folder, error: folderError } = await supabaseAdmin
            .from('question_folders')
            .select('*')
            .eq('id', folderId)
            .single();

        if (folderError && folderError.code !== 'PGRST116') {
            console.error('Error fetching folder:', folderError);
            return NextResponse.json({ error: folderError.message }, { status: 500 });
        }

        // Build query for folder items
        let query = supabaseAdmin
            .from('question_folder_items')
            .select('question_id, position, questions(*)', { count: 'exact' })
            .eq('folder_id', folderId)
            .order('position', { ascending: true });

        if (search) {
            query = query.filter('questions.question_text', 'ilike', `%${search}%`);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: folderItems, error: itemsError, count } = await query.range(from, to);

        if (itemsError) {
            console.error('Error fetching folder items:', itemsError);
            return NextResponse.json({ error: itemsError.message }, { status: 500 });
        }

        // Filter out null questions (if search filtered them out in the join)
        const validItems = (folderItems || []).filter(item => item.questions !== null);
        const questionIds = validItems.map(item => item.question_id);

        // Fetch options, tags, subjects for these questions in parallel
        if (questionIds.length > 0) {
            const [optionsResult, tagsResult, subjectsResult] = await Promise.all([
                supabaseAdmin.from('question_options').select('*').in('question_id', questionIds),
                supabaseAdmin.from('question_tags').select('*').in('question_id', questionIds),
                supabaseAdmin.from('subjects').select('id, name, parent_id').in('id',
                    validItems.map(item => item.questions?.subject_id).filter(Boolean)
                )
            ]);

            // Map data
            const optionsMap = {};
            if (optionsResult.data) {
                optionsResult.data.forEach(opt => {
                    if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
                    optionsMap[opt.question_id].push(opt);
                });
            }

            const tagsMap = {};
            if (tagsResult.data) {
                tagsResult.data.forEach(tag => {
                    if (!tagsMap[tag.question_id]) tagsMap[tag.question_id] = [];
                    tagsMap[tag.question_id].push(tag);
                });
            }

            const subjectsMap = {};
            if (subjectsResult.data) {
                subjectsResult.data.forEach(subj => {
                    subjectsMap[subj.id] = subj;
                });
            }

            // Enrich folder items with options, tags, subjects
            validItems.forEach(item => {
                if (item.questions) {
                    item.questions.options = (optionsMap[item.question_id] || []).sort((a, b) =>
                        (a.option_label || '').localeCompare(b.option_label || '')
                    );
                    item.questions.tags = tagsMap[item.question_id] || [];
                    item.questions.subjects = subjectsMap[item.questions.subject_id] || null;
                }
            });
        }

        return NextResponse.json({
            success: true,
            data: validItems,
            count: count || 0,
            folder: folder,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit),
                total: count
            }
        });

    } catch (err) {
        console.error('API Server Error:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
