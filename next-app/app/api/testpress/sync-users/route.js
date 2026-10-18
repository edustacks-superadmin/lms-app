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

        if (!baseUrl) {
            return NextResponse.json(
                { error: 'Testpress base URL not configured' },
                { status: 400 }
            );
        }

        // Get cached token
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

        // Fetch ALL users from Testpress (handle pagination)
        let allUsers = [];
        let nextUrl = `${baseUrl}/api/v2.5/admin/users/`;
        let pageCount = 0;

        while (nextUrl) {
            pageCount++;
            console.log(`Fetching users page ${pageCount}: ${nextUrl}`);

            const usersResponse = await fetchWithRetry(nextUrl, {
                headers: {
                    'Authorization': `JWT ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!usersResponse.ok) {
                const errorText = await usersResponse.text();
                console.error('Testpress users fetch failed:', {
                    status: usersResponse.status,
                    error: errorText,
                    url: nextUrl
                });
                return NextResponse.json(
                    {
                        error: 'Failed to fetch users from Testpress',
                        details: `Status ${usersResponse.status}: ${errorText}`
                    },
                    { status: usersResponse.status }
                );
            }

            const usersData = await usersResponse.json();
            const pageUsers = usersData.results || [];
            allUsers = allUsers.concat(pageUsers);

            console.log(`Page ${pageCount}: ${pageUsers.length} users (Total: ${allUsers.length})`);

            nextUrl = usersData.next;
        }

        console.log(`Total users fetched: ${allUsers.length}`);

        // Sync users to local database
        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };

        for (const tpUser of allUsers) {
            try {
                // Check if user already exists by testpress_id or email
                const { data: existingMember } = await supabaseAdmin
                    .from('members')
                    .select('id, email, testpress_id')
                    .or(`testpress_id.eq.${tpUser.id},email.eq.${tpUser.email}`)
                    .single();

                const memberData = {
                    email: tpUser.email,
                    display_name: tpUser.display_name || tpUser.first_name || tpUser.username,
                    phone_number: tpUser.phone || tpUser.mobile || null,
                    testpress_id: tpUser.id,
                    role: tpUser.is_staff ? 'admin' : 'student',
                    status: tpUser.is_active ? 'Active' : 'Inactive'
                };

                if (existingMember) {
                    // Update existing member
                    const { error: updateError } = await supabaseAdmin
                        .from('members')
                        .update(memberData)
                        .eq('id', existingMember.id);

                    if (updateError) {
                        results.failed++;
                        results.errors.push(`Failed to update: ${tpUser.email}`);
                        console.error('Update error:', updateError);
                    } else {
                        results.updated++;
                    }
                } else {
                    // Insert new member
                    const { error: insertError } = await supabaseAdmin
                        .from('members')
                        .insert({
                            ...memberData,
                            joining_date: new Date().toISOString()
                        });

                    if (insertError) {
                        if (insertError.code === '23505') {
                            results.skipped++;
                        } else {
                            results.failed++;
                            results.errors.push(`Failed to import: ${tpUser.email} - ${insertError.message}`);
                            console.error('Insert error:', insertError);
                        }
                    } else {
                        results.imported++;
                    }
                }
            } catch (error) {
                results.failed++;
                results.errors.push(`Error: ${tpUser.email} - ${error.message}`);
                console.error('User sync error:', error);
            }
        }

        return NextResponse.json({
            success: true,
            total: allUsers.length,
            results
        });

    } catch (error) {
        console.error('Testpress users sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
