import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTestpressToken, fetchWithRetry } from '@/lib/testpressAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('🚀 Starting Testpress Question Sets Sync...');
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (msg) => controller.enqueue(encoder.encode(`data: ${msg}\n\n`));

            try {
                send('Authenticating with Testpress...');
                const token = await getTestpressToken();
                send('Authentication successful.');

                let url = `${process.env.TESTPRESS_BASE_URL}/api/v2.5/admin/question_sets/`;
                let processed = 0;
                let created = 0;
                let updated = 0;

                while (url) {
                    send(`Fetching URL: ${url}`);
                    const response = await fetchWithRetry(url, token);

                    if (!response.ok) {
                        throw new Error(`Failed to fetch sets: ${response.statusText}`);
                    }

                    const data = await response.json();
                    const sets = data.results || [];

                    send(`Processing ${sets.length} sets...`);

                    for (const set of sets) {
                        try {
                            // Check for existing folder by testpress_id
                            const { data: existingFolder } = await supabaseAdmin
                                .from('question_folders')
                                .select('id')
                                .eq('testpress_id', set.id)
                                .maybeSingle();

                            // Map fields
                            // Testpress "Set" -> Local "Question Folder"
                            // Hierarchy: sets have 'parent_url'. We are flattening for now as requested.
                            const folderData = {
                                name: set.title || set.name || "Untitled Folder",
                                testpress_id: set.id,
                                institute_id: 10,
                                // Use tree_path as description to show hierarchy context if available
                                description: set.tree_path || set.description || ""
                            };

                            if (existingFolder) {
                                // Update
                                await supabaseAdmin
                                    .from('question_folders')
                                    .update(folderData)
                                    .eq('id', existingFolder.id);
                                updated++;
                            } else {
                                // Create
                                await supabaseAdmin
                                    .from('question_folders')
                                    .insert(folderData);
                                created++;
                            }
                            processed++;
                        } catch (err) {
                            console.error(`Error processing set ${set.id}:`, err);
                            send(`Error processing set ${set.id}: ${err.message}`);
                        }
                    }

                    url = data.next;
                    send(`Processed ${processed} sets so far (Created: ${created}, Updated: ${updated})...`);
                }

                send(`✅ Sync Complete! Total: ${processed} Created: ${created} Updated: ${updated}`);
                controller.close();

            } catch (error) {
                console.error('Sync failed:', error);
                send(`❌ Sync Failed: ${error.message}`);
                controller.close();
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
