import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTestpressToken, fetchWithRetry } from '../../../../lib/testpressAuth';

// TEST: Import only 20 users to debug issues
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

        // Fetch only first 20 users
        const usersResponse = await fetchWithRetry(`${baseUrl}/api/v2.5/admin/users/`, {
            headers: {
                'Authorization': `JWT ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!usersResponse.ok) {
            throw new Error(`Failed to fetch users: ${usersResponse.status}`);
        }

        const usersData = await usersResponse.json();
        const users = (usersData.results || []).slice(0, 20); // Only 20!

        console.log(`TEST: Processing ${users.length} users`);

        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };

        for (const tpUser of users) {
            try {
                console.log(`Processing user: ${tpUser.email}`);

                // Convert birth_date from DD/MM/YYYY to YYYY-MM-DD
                let birthDate = null;
                if (tpUser.birth_date) {
                    const parts = tpUser.birth_date.split('/');
                    if (parts.length === 3) {
                        birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
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

                // Try insert
                const { error: insertError } = await supabaseAdmin
                    .from('members')
                    .insert({
                        ...memberData,
                        joining_date: new Date().toISOString()
                    });

                if (!insertError) {
                    results.imported++;
                    console.log(`✅ Imported: ${tpUser.email}`);
                } else {
                    results.failed++;
                    results.errors.push(`${tpUser.email}: ${insertError.message}`);
                    console.error(`❌ Failed ${tpUser.email}:`, insertError);
                }

            } catch (error) {
                results.failed++;
                results.errors.push(`${tpUser.email}: ${error.message}`);
                console.error(`❌ Error ${tpUser.email}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            total: users.length,
            results
        });

    } catch (error) {
        console.error('Test import error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
