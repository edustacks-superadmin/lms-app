import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get all feedback responses for a course
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const courseId = parseInt(id);
        const { searchParams } = new URL(request.url);

        const search = searchParams.get('search') || '';
        const rating = searchParams.get('rating');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get form id
        const { data: form } = await supabaseAdmin
            .from('course_feedback_forms')
            .select('id')
            .eq('course_id', courseId)
            .single();

        if (!form) {
            return NextResponse.json({ responses: [], total: 0 });
        }

        // Get responses with user info and answers
        let query = supabaseAdmin
            .from('feedback_responses')
            .select(`
                id,
                submitted_at,
                user_id,
                members (
                    id,
                    first_name,
                    last_name,
                    email,
                    photo_url
                ),
                feedback_answers (
                    id,
                    question_id,
                    text_answer,
                    rating_value,
                    feedback_questions (
                        id,
                        question_text,
                        question_type
                    )
                )
            `, { count: 'exact' })
            .eq('form_id', form.id)
            .order('submitted_at', { ascending: false });

        // Date filters
        if (startDate) {
            query = query.gte('submitted_at', startDate);
        }
        if (endDate) {
            query = query.lte('submitted_at', endDate + 'T23:59:59Z');
        }

        // Pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: responses, error, count } = await query;

        if (error) {
            console.error('Error fetching responses:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Process responses to calculate average rating
        const processedResponses = (responses || []).map(response => {
            const ratings = response.feedback_answers
                ?.filter(a => a.rating_value)
                .map(a => a.rating_value) || [];

            const avgRating = ratings.length > 0
                ? ratings.reduce((a, b) => a + b, 0) / ratings.length
                : null;

            // Get first text answer as preview
            const textAnswer = response.feedback_answers
                ?.find(a => a.text_answer)?.text_answer || '';

            return {
                ...response,
                avg_rating: avgRating,
                feedback_preview: textAnswer.substring(0, 100) + (textAnswer.length > 100 ? '...' : '')
            };
        });

        // Filter by rating if specified
        let filteredResponses = processedResponses;
        if (rating && rating !== 'all') {
            const ratingValue = parseInt(rating);
            filteredResponses = processedResponses.filter(r =>
                Math.round(r.avg_rating) === ratingValue
            );
        }

        // Filter by search (student name)
        if (search) {
            const searchLower = search.toLowerCase();
            filteredResponses = filteredResponses.filter(r =>
                `${r.members?.first_name} ${r.members?.last_name}`.toLowerCase().includes(searchLower) ||
                r.members?.email?.toLowerCase().includes(searchLower)
            );
        }

        return NextResponse.json({
            responses: filteredResponses,
            total: count || 0,
            page,
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (error) {
        console.error('Error in GET /api/admin/courses/[id]/feedback/responses:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
