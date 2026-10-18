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

        // 1. Get all batches with testpress_id
        const { data: batches, error: batchesError } = await supabaseAdmin
            .from('batches')
            .select('id, name, testpress_id')
            .not('testpress_id', 'is', null);

        if (batchesError) {
            throw new Error(`Failed to fetch batches: ${batchesError.message}`);
        }

        console.log(`Found ${batches.length} batches to sync members for`);

        let totalSynced = 0;
        let errors = [];

        for (const batch of batches) {
            console.log(`Syncing members for batch: ${batch.name} (${batch.testpress_id})`);
            try {
                // Fetch members for this batch from Testpress
                // Assuming endpoint: /api/v2.5/admin/batches/{id}/students/
                const studentsUrl = `${baseUrl}/api/v2.5/admin/batches/${batch.testpress_id}/students/`;

                // We need to handle pagination if there are many students
                let allBatchStudents = [];
                let nextUrl = studentsUrl;

                while (nextUrl) {
                    const response = await fetchWithRetry(nextUrl, {
                        headers: {
                            'Authorization': `JWT ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const results = data.results || data || [];
                        allBatchStudents = allBatchStudents.concat(results);
                        nextUrl = data.next;
                    } else {
                        // If 404, maybe endpoint is different or batch empty
                        if (response.status === 404) {
                            console.warn(`Batch endpoint not found for ${batch.name}`);
                        } else {
                            console.error(`Failed to fetch students for batch ${batch.name}: ${response.status}`);
                        }
                        nextUrl = null;
                    }
                }

                if (allBatchStudents.length > 0) {
                    console.log(`Found ${allBatchStudents.length} students in Testpress for batch ${batch.name}`);

                    // 1. Get Testpress UUIDs/IDs of these students
                    // Testpress user objects usually have 'id', 'url', 'username', 'email' etc.
                    // IMPORTANT: The `members` table in local DB has `testpress_id`.
                    // We need to match Testpress student -> Local Member.

                    // Extract testpress_ids from the response
                    // Note: The response might be a list of "Student" objects which contain "user" object or "id" directly.
                    // Typically /students/ returns a list of student enrollments.
                    // Let's assume the object has a 'user' field with 'id', or the object itself is the user info?
                    // Usually it's: { user: { id: ..., username: ... } } OR just user fields.
                    // I will assume the object has 'id' which maps to `members.testpress_id` or 'user.id'.

                    const testpressMap = allBatchStudents.map(s => s.user ? s.user.id : s.id).filter(id => id);

                    if (testpressMap.length > 0) {
                        // 2. Find matching local members
                        const { data: localMembers, error: membersError } = await supabaseAdmin
                            .from('members')
                            .select('id, testpress_id')
                            .in('testpress_id', testpressMap);

                        if (membersError) throw membersError;

                        if (localMembers && localMembers.length > 0) {
                            // 3. Insert into batch_members
                            const records = localMembers.map(m => ({
                                batch_id: batch.id,
                                member_id: m.id
                            }));

                            // Use upsert or ignore duplicates
                            const { error: insertError } = await supabaseAdmin
                                .from('batch_members')
                                .upsert(records, { onConflict: 'batch_id, member_id', ignoreDuplicates: true });

                            if (insertError) {
                                throw insertError;
                            }
                            totalSynced += records.length;
                            console.log(`Synced ${records.length} members for batch ${batch.name}`);
                        }
                    }
                }

            } catch (err) {
                console.error(`Error syncing batch ${batch.name}:`, err);
                errors.push(`Batch ${batch.name}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            batchesProcessed: batches.length,
            membersSynced: totalSynced,
            errors
        });

    } catch (error) {
        console.error('Batch members sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
