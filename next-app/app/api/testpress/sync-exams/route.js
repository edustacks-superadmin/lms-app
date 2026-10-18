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

        // Fetch all exams from Testpress v2.5 with pagination
        let allExams = [];
        let nextUrl = `${baseUrl}/api/v2.5/admin/exams/`;

        console.log('🚀 Starting Testpress exams sync (v2.5 API)...');

        while (nextUrl) {
            const response = await fetchWithRetry(nextUrl, {
                headers: {
                    'Authorization': `JWT ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch exams: ${response.status}`);
            }

            const data = await response.json();
            allExams = allExams.concat(data.results || []);
            nextUrl = data.next;

            console.log(`Fetched ${allExams.length} exams so far...`);
        }

        console.log(`✅ Total exams fetched from Testpress: ${allExams.length}`);
        console.log('📊 Starting database sync...\n');

        let created = 0;
        let updated = 0;
        let skipped = 0;
        let errors = [];
        const startTime = Date.now();

        for (let i = 0; i < allExams.length; i++) {
            const tpExam = allExams[i];

            try {
                // Convert duration from "HH:MM:SS" to minutes
                const durationMinutes = convertDuration(tpExam.duration);

                // Prepare exam data mapped from Testpress fields
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
                    show_score: tpExam.show_score !== false, // Default true
                    show_percentile: tpExam.show_percentile || false,
                    enable_ranks: tpExam.enable_ranks || false,
                    variable_marks: tpExam.variable_mark_per_question || false,
                    is_active: true,
                    updated_at: new Date().toISOString()
                };

                // Check if exam already exists
                const { data: existingExam } = await supabaseAdmin
                    .from('exams')
                    .select('id')
                    .eq('testpress_id', tpExam.id)
                    .single();

                if (existingExam) {
                    // Update existing exam
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
                    // Create new exam
                    const { error: insertError } = await supabaseAdmin
                        .from('exams')
                        .insert(examData);

                    if (insertError) {
                        // Check if it's a duplicate slug error
                        if (insertError.code === '23505' && insertError.message.includes('slug')) {
                            // Update slug to make it unique
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

                // Progress logging every 100 exams
                if ((i + 1) % 100 === 0) {
                    const processed = created + updated + skipped;
                    const percentComplete = ((i + 1) / allExams.length * 100).toFixed(1);
                    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
                    const avgTimePerExam = elapsedSeconds / (i + 1);
                    const estimatedRemaining = (avgTimePerExam * (allExams.length - (i + 1)) / 60).toFixed(1);

                    console.log(`📈 Progress: ${i + 1}/${allExams.length} (${percentComplete}%) | Created: ${created} | Updated: ${updated} | Errors: ${errors.length} | ETA: ${estimatedRemaining}m`);
                }

            } catch (error) {
                errors.push(`Error processing exam ${tpExam.id}: ${error.message}`);
                skipped++;
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
        console.log(`\n✅ Sync completed in ${totalTime} minutes`);
        console.log(`📊 Final stats: Created: ${created} | Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors.length}`);

        return NextResponse.json({
            success: true,
            summary: {
                totalFetched: allExams.length,
                created,
                updated,
                skipped,
                errors: errors.length,
                syncTimeMinutes: parseFloat(totalTime)
            },
            errors: errors.length > 0 ? errors.slice(0, 10) : [],
            message: `Sync completed in ${totalTime} minutes. Created: ${created}, Updated: ${updated}`
        });

    } catch (error) {
        console.error('Exam sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// Helper function to convert Testpress duration to minutes
function convertDuration(durationString) {
    if (!durationString) return null;

    try {
        // Input format: "0:30:00" (HH:MM:SS)
        const [hours, minutes, seconds] = durationString.split(':').map(Number);
        return hours * 60 + minutes;
    } catch (error) {
        console.error('Duration conversion error:', error);
        return null;
    }
}
