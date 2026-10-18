import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        // Extract parameters
        const page = parseInt(searchParams.get('page')) || 1;
        const perPage = parseInt(searchParams.get('perPage')) || 50;
        const search = searchParams.get('search') || '';
        const subjectId = searchParams.get('subjectId');
        const questionType = searchParams.get('type');
        const difficultyLevel = searchParams.get('difficulty');
        const instituteId = searchParams.get('instituteId');

        // Calculate pagination range
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const folderId = searchParams.get('folderId');
        const tags = searchParams.get('tags');

        console.log('API Request Params:', { page, perPage, search, subjectId, questionType, difficultyLevel, folderId, tags });

        // ---------------------------------------------------------
        // 1. Two-Step Filtering: Fetch IDs for Related Data First
        // ---------------------------------------------------------
        let allowedQuestionIds = null; // null means no ID filter applied yet

        // A. Tag Filter
        if (tags && tags !== 'null') {
            const tagNames = tags.split(',').filter(Boolean).map(t => t.trim());
            if (tagNames.length > 0) {
                // Fetch IDs of questions that have THESE tags
                const { data: tagData, error: tagError } = await supabaseAdmin
                    .from('question_tags')
                    .select('question_id')
                    .in('tag_name', tagNames);

                if (!tagError && tagData) {
                    const tagIds = tagData.map(t => t.question_id);
                    // Intersection logic: if we already have allowed IDs, intersect. Else set.
                    allowedQuestionIds = allowedQuestionIds
                        ? allowedQuestionIds.filter(id => tagIds.includes(id))
                        : tagIds;
                } else {
                    console.error("Error fetching tag IDs:", tagError);
                }
            }
        }

        // B. Folder Filter
        if (folderId && folderId !== 'null') {
            const ids = folderId.split(',').filter(Boolean);
            if (ids.length > 0) {
                const { data: folderData, error: folderError } = await supabaseAdmin
                    .from('question_folder_items')
                    .select('question_id')
                    .in('folder_id', ids);

                if (!folderError && folderData) {
                    const folderIds = folderData.map(f => f.question_id);
                    allowedQuestionIds = allowedQuestionIds
                        ? allowedQuestionIds.filter(id => folderIds.includes(id))
                        : folderIds;
                } else {
                    console.error("Error fetching folder IDs:", folderError);
                }
            }
        }

        // If filtering happened but resulted in NO matches, return early
        if (allowedQuestionIds !== null && allowedQuestionIds.length === 0) {
            return NextResponse.json({
                success: true,
                data: [],
                count: 0,
                pagination: { page, perPage, totalPages: 0, total: 0 }
            });
        }

        // ---------------------------------------------------------
        // 2. Build Main Query
        // ---------------------------------------------------------
        let selectQuery = `
            *,
            subjects (name, parent_id)
        `;

        let query = supabaseAdmin
            .from('questions')
            .select(selectQuery, { count: 'exact' });

        if (!instituteId) {
            return NextResponse.json({
                success: true,
                data: [],
                count: 0,
                pagination: { page, perPage, totalPages: 0, total: 0 }
            });
        }

        query = query.eq('institute_id', instituteId);

        // Apply ID Filter
        if (allowedQuestionIds !== null) {
            query = query.in('id', allowedQuestionIds);
        }

        // Apply Direct Column Filters
        if (subjectId && subjectId !== 'null' && subjectId !== 'undefined') {
            const ids = subjectId.split(',').filter(Boolean);
            if (ids.length > 0) query = query.in('subject_id', ids);
        }

        if (questionType && questionType !== 'null' && questionType !== 'undefined') {
            const types = questionType.split(',').filter(Boolean);
            if (types.length > 0) query = query.in('question_type', types);
        }

        if (difficultyLevel && difficultyLevel !== 'null' && difficultyLevel !== 'undefined') {
            const levels = difficultyLevel.split(',').filter(Boolean);
            if (levels.length > 0) query = query.in('difficulty_level', levels);
        }

        if (search) {
            query = query.ilike('question_text', `%${search}%`);
        }

        // Execute Main Query
        const { data: questions, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Return early if no questions
        if (!questions || questions.length === 0) {
            return NextResponse.json({
                success: true,
                data: [],
                count: count || 0,
                pagination: {
                    page,
                    perPage,
                    totalPages: Math.ceil((count || 0) / perPage),
                    total: count
                }
            });
        }

        // Fetch Related Data (Options, Tags, Stats) in Parallel
        const questionIds = questions.map(q => q.id);

        const [optionsResult, tagsResult, statsResult] = await Promise.all([
            supabaseAdmin.from('question_options').select('*').in('question_id', questionIds),
            supabaseAdmin.from('question_tags').select('*').in('question_id', questionIds),
            supabaseAdmin.rpc('get_questions_stats', { question_ids: questionIds })
        ]);

        // Process Relations
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

        const statsMap = {};
        if (statsResult.data) {
            statsResult.data.forEach(s => {
                statsMap[s.question_id] = s.percentage_correct;
            });
        }

        // Combine Data
        const processedQuestions = questions.map(q => ({
            ...q,
            options: (optionsMap[q.id] || []).sort((a, b) =>
                (a.option_label || '').localeCompare(b.option_label || '')
            ),
            tags: tagsMap[q.id] || [],
            percentage_correct: statsMap[q.id] ?? null
        }));

        return NextResponse.json({
            success: true,
            data: processedQuestions,
            count: count || 0,
            pagination: {
                page,
                perPage,
                totalPages: Math.ceil((count || 0) / perPage),
                total: count
            }
        });

    } catch (err) {
        console.error('API Server Error:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
