import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTestpressToken, fetchWithRetry } from '../../../../lib/testpressAuth';
import { createJob, updateJob, updateProgress, completeJob, failJob } from '../../../../lib/jobTracker';

export async function POST(request) {
    try {
        console.log('Starting background user import...');

        // Create job immediately and return
        const jobId = createJob('users-sync');
        console.log('Job created:', jobId);

        // Start background processing (don't await)
        processUsersInBackground(jobId).catch(error => {
            console.error('Background processing error:', error);
            failJob(jobId, error);
        });

        console.log('Returning job ID to client:', jobId);

        return NextResponse.json({
            success: true,
            jobId,
            message: 'User import started in background'
        });

    } catch (error) {
        console.error('Error starting user import:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to start import' },
            { status: 500 }
        );
    }
}

async function processUsersInBackground(jobId) {
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

    try {
        updateJob(jobId, { status: 'running' });
        updateProgress(jobId, 0, 0, 'Authenticating with Testpress...');

        // Get token
        const token = await getTestpressToken();

        updateProgress(jobId, 0, 0, 'Fetching users from Testpress...');

        // Fetch all users
        let allUsers = [];
        let nextUrl = `${baseUrl}/api/v2.5/admin/users/`;
        let pageCount = 0;

        while (nextUrl) {
            pageCount++;
            const usersResponse = await fetchWithRetry(nextUrl, {
                headers: {
                    'Authorization': `JWT ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!usersResponse.ok) {
                throw new Error(`Failed to fetch users: ${usersResponse.status}`);
            }

            const usersData = await usersResponse.json();
            const pageUsers = usersData.results || [];
            allUsers = allUsers.concat(pageUsers);

            updateProgress(jobId, allUsers.length, allUsers.length, `Fetched ${allUsers.length} users...`);

            nextUrl = usersData.next;
        }

        const totalUsers = allUsers.length;
        updateProgress(jobId, 0, totalUsers, `Processing ${totalUsers} users...`);

        // Process users
        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };

        const CHUNK_SIZE = 50; // Process 50 users at a time

        for (let i = 0; i < allUsers.length; i++) {
            const tpUser = allUsers[i];

            try {
                // Check if user exists
                const { data: existingMember } = await supabaseAdmin
                    .from('members')
                    .select('id, email, testpress_id')
                    .or(`testpress_id.eq.${tpUser.id},email.eq.${tpUser.email}`)
                    .single();

                // Convert birth_date from DD/MM/YYYY to YYYY-MM-DD for PostgreSQL
                let birthDate = null;
                if (tpUser.birth_date) {
                    const parts = tpUser.birth_date.split('/');
                    if (parts.length === 3) {
                        birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert to YYYY-MM-DD
                    }
                }

                // Extract state code from "IN-TN" format
                const stateCode = tpUser.state ? tpUser.state.split('-')[1] : null;

                const memberData = {
                    // Basic info
                    username: tpUser.username,
                    email: tpUser.email,
                    first_name: tpUser.first_name || null,
                    last_name: tpUser.last_name || null,
                    display_name: tpUser.display_name || `${tpUser.first_name || ''} ${tpUser.last_name || ''}`.trim() || tpUser.username,
                    phone_number: tpUser.phone || null,

                    // Address
                    address1: tpUser.address1 || null,
                    address2: tpUser.address2 || null,
                    city: tpUser.city || null,
                    state: tpUser.state || null,
                    state_code: stateCode,
                    zip: tpUser.zip || null,

                    // Other
                    birth_date: birthDate,
                    photo_url: tpUser.photo || null,

                    // Testpress specific
                    testpress_id: tpUser.id,
                    role: tpUser.is_staff ? 'admin' : 'student',
                    status: tpUser.is_active ? 'active' : 'inactive',
                    is_active: tpUser.is_active || false,
                    is_blocked: !tpUser.is_active
                };

                if (existingMember) {
                    // Update existing
                    const { error: updateError } = await supabaseAdmin
                        .from('members')
                        .update(memberData)
                        .eq('id', existingMember.id);

                    if (!updateError) {
                        results.updated++;
                    } else {
                        results.failed++;
                        results.errors.push(`Update failed: ${tpUser.email}`);
                        console.error('Update error for user:', tpUser.email, updateError);
                    }
                } else {
                    // Insert new
                    const { error: insertError } = await supabaseAdmin
                        .from('members')
                        .insert({
                            ...memberData,
                            joining_date: new Date().toISOString()
                        });

                    if (!insertError) {
                        results.imported++;
                    } else if (insertError?.code === '23505') {
                        results.skipped++;
                    } else {
                        results.failed++;
                        results.errors.push(`Import failed: ${tpUser.email}`);
                        console.error('Insert error for user:', tpUser.email, insertError);
                    }
                }

            } catch (error) {
                results.failed++;
                results.errors.push(`Error: ${tpUser.email} - ${error.message}`);
                console.error('User processing error:', tpUser.email, error);
            }

            // Update progress every 10 users
            if ((i + 1) % 10 === 0 || i === allUsers.length - 1) {
                updateProgress(
                    jobId,
                    i + 1,
                    allUsers.length,
                    `Processed ${i + 1}/${allUsers.length} users (${results.imported} imported, ${results.updated} updated)`
                );
            }

            // Small delay every chunk to avoid overload
            if ((i + 1) % CHUNK_SIZE === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        completeJob(jobId, {
            total: totalUsers,
            ...results
        });

    } catch (error) {
        console.error('Background processing error:', error);
        failJob(jobId, error);
    }
}
