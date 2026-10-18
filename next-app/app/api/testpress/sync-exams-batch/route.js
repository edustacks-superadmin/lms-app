import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTestpressToken, fetchWithRetry } from '../../../../lib/testpressAuth';

export async function POST(request) {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        const baseUrl = process.env.TESTPRESS_BASE_URL;
        const token = await getTestpressToken();

        // Get parameters from request body
        const body = await request.json().catch(() => ({}));
        const batchSize = body.batchSize || 500; // Process 500 exams per request
        const startPage = body.startPage || 1;
        const maxPages = body.maxPages || 2; // Process 2 pages (500 exams) per invocation

        console.log(`🚀 Starting batch sync: Page ${startPage}, Batch size: ${batchSize}, Max pages: ${maxPages}`);

        // Fetch exams for the specified pages
        let allExams = [];
        let currentPage = startPage;
        let pagesProcessed = 0;

        while (pagesProcessed < maxPages) {
            const url = `${baseUrl}/api/v2.5/admin/exams/?page=${currentPage}&page_size=250`;

            const response = await fetchWithRetry(url, {
                headers: {
                    'Authorization': `JWT ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`Failed to fetch page ${currentPage}: ${response.status}`);
                break;
            }

            const data = await response.json();
            const exams = data.results || [];

            if (exams.length === 0) {
                console.log('✅ No more exams to fetch');
                break;
            }

            allExams = allExams.concat(exams);
            console.log(`📥 Fetched page ${currentPage}: ${exams.length} exams`);

            currentPage++;
            pagesProcessed++;

            // Check if there's a next page
            if (!data.next) {
                console.log('✅ Reached last page');
                break;
            }
        }

        console.log(`✅ Total exams fetched: ${allExams.length}`);

        // Sync exams to database
        let created = 0;
        let updated = 0;
        let skipped = 0;
        let errors = [];
        const startTime = Date.now();

        for (const tpExam of allExams) {
            try {
                const durationMinutes = convertDuration(tpExam.duration);

                const examData = {
                    testpress_id: tpExam.id,
                    title: tpExam.title,
                    description: tpExam.description || null,
                    slug: tpExam.slug,
                    start_date: tpExam.start_date || null,
                    end_date: tpExam.end_date || null,
                    duration_minutes: durationMinutes,
                    number_of_questions: tpExam.number_of_questions,
                    marks_per_question: tpExam.mark_per_question || null,
                    negative_marks_per_question: tpExam.negative_marks || 0,
                    negative_marking_enabled: tpExam.negative_marks > 0,
                    max_attempts: tpExam.max_retakes || 1,
                    show_answers: tpExam.show_answers || false,
                    show_score: tpExam.show_score !== false,
                    show_percentile: tpExam.show_percentile || false,
                    enable_ranks: tpExam.enable_ranks || false,
                    variable_marks: tpExam.variable_mark_per_question || false,
                    is_active: true,
                    updated_at: new Date().toISOString()
                };

                const { data: existingExam } = await supabaseAdmin
                    .from('exams')
                    .select('id')
                    .eq('testpress_id', tpExam.id)
                    .single();

                if (existingExam) {
                    const { error: updateError } = await supabaseAdmin
                        .from('exams')
                        .update(examData)
                        .eq('id', existingExam.id);

                    if (updateError) {
                        errors.push(`Update failed for exam ${tpExam.id}: ${updateError.message}`);
                        continue;
                    }
                    updated++;
                } else {
                    const { error: insertError } = await supabaseAdmin
                        .from('exams')
                        .insert(examData);

                    if (insertError) {
                        if (insertError.code === '23505' && insertError.message.includes('slug')) {
                            examData.slug = `${tpExam.slug}-${tpExam.id}`;
                            const { error: retryError } = await supabaseAdmin
                                .from('exams')
                                .insert(examData);

                            if (retryError) {
                                errors.push(`Insert failed for exam ${tpExam.id}: ${retryError.message}`);
                                continue;
                            }
                            created++;
                        } else {
                            errors.push(`Insert failed for exam ${tpExam.id}: ${insertError.message}`);
                            continue;
                        }
                    } else {
                        created++;
                    }
                }

            } catch (error) {
                errors.push(`Error processing exam ${tpExam.id}: ${error.message}`);
                skipped++;
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const nextPage = pagesProcessed >= maxPages ? currentPage : null;

        return NextResponse.json({
            success: true,
            batch: {
                startPage,
                endPage: currentPage - 1,
                pagesProcessed,
                totalFetched: allExams.length,
                created,
                updated,
                skipped,
                errors: errors.length,
                syncTimeSeconds: parseFloat(totalTime)
            },
            nextPage: nextPage,
            hasMore: pagesProcessed < maxPages,
            message: nextPage
                ? `Batch complete. To continue, call again with startPage=${nextPage}`
                : 'All pages in this batch processed',
            errors: errors.length > 0 ? errors.slice(0, 5) : []
        });

    } catch (error) {
        console.error('Batch sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

function convertDuration(durationString) {
    if (!durationString) return null;

    try {
        const [hours, minutes, seconds] = durationString.split(':').map(Number);
        return hours * 60 + minutes;
    } catch (error) {
        console.error('Duration conversion error:', error);
        return null;
    }
}
