import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTestpressToken, fetchWithRetry } from '../../../../lib/testpressAuth';

export async function POST(request) {
    try {
        // Initialize Supabase client
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

        if (!baseUrl) {
            return NextResponse.json(
                { error: 'Testpress base URL not configured' },
                { status: 400 }
            );
        }

        // Get cached token (or fetch new one if needed)
        let token;
        try {
            token = await getTestpressToken();
        } catch (authError) {
            console.error('Testpress authentication error:', authError);
            return NextResponse.json(
                {
                    error: 'Testpress authentication failed',
                    details: authError.message
                },
                { status: 401 }
            );
        }

        // Step 2: Fetch ALL batches from Testpress (handle pagination)
        let allBatches = [];
        let nextUrl = `${baseUrl}/api/v2.5/admin/batches/`;
        let pageCount = 0;

        while (nextUrl) {
            pageCount++;
            console.log(`Fetching page ${pageCount}: ${nextUrl}`);

            const batchesResponse = await fetchWithRetry(nextUrl, {
                headers: {
                    'Authorization': `JWT ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!batchesResponse.ok) {
                const errorText = await batchesResponse.text();
                console.error('Testpress batches fetch failed:', {
                    status: batchesResponse.status,
                    statusText: batchesResponse.statusText,
                    error: errorText,
                    url: nextUrl,
                    authHeader: `JWT ${token.substring(0, 20)}...`
                });
                return NextResponse.json(
                    {
                        error: 'Failed to fetch batches from Testpress',
                        details: `Status ${batchesResponse.status}: ${errorText}`,
                        statusCode: batchesResponse.status
                    },
                    { status: batchesResponse.status }
                );
            }

            const batchesData = await batchesResponse.json();
            const pageBatches = batchesData.results || [];
            allBatches = allBatches.concat(pageBatches);

            console.log(`Page ${pageCount}: Got ${pageBatches.length} batches, Total so far: ${allBatches.length}`);

            // Get next page URL from response
            nextUrl = batchesData.next;
        }

        console.log(`Total batches fetched: ${allBatches.length} across ${pageCount} pages`);
        const testpressBatches = allBatches;

        // Step 3: Sync batches to local database
        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };

        for (const tpBatch of testpressBatches) {
            try {
                // Check if batch already exists by testpress_id
                const { data: existingBatch } = await supabaseAdmin
                    .from('batches')
                    .select('id, name, testpress_id')
                    .eq('testpress_id', tpBatch.id)
                    .single();

                if (existingBatch) {
                    // Update existing batch
                    const { error: updateError } = await supabaseAdmin
                        .from('batches')
                        .update({
                            name: tpBatch.name
                        })
                        .eq('id', existingBatch.id);

                    if (updateError) {
                        results.failed++;
                        results.errors.push(`Failed to update batch ${tpBatch.name}: ${updateError.message}`);
                    } else {
                        results.updated++;
                    }
                } else {
                    // Insert new batch
                    const { error: insertError } = await supabaseAdmin
                        .from('batches')
                        .insert({
                            name: tpBatch.name,
                            testpress_id: tpBatch.id
                        });

                    if (insertError) {
                        // Check if it's a duplicate name error
                        if (insertError.code === '23505') {
                            results.skipped++;
                        } else {
                            results.failed++;
                            results.errors.push(`Failed to import batch ${tpBatch.name}: ${insertError.message}`);
                        }
                    } else {
                        results.imported++;
                    }
                }
            } catch (error) {
                results.failed++;
                results.errors.push(`Error processing batch ${tpBatch.name}: ${error.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            total: testpressBatches.length,
            results
        });

    } catch (error) {
        console.error('Testpress sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
