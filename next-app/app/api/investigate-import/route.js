import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getTestpressToken, fetchWithRetry } from '../../../lib/testpressAuth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const baseUrl = process.env.TESTPRESS_BASE_URL;

export async function GET() {
    try {
        console.log('Starting missing records investigation...');

        // 1. Fetch all Testpress user IDs
        const token = await getTestpressToken();
        let allTestpressUsers = [];
        let nextUrl = `${baseUrl}/api/v2.5/admin/users/`;

        while (nextUrl) {
            const response = await fetchWithRetry(nextUrl, {
                headers: {
                    'Authorization': `JWT ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch Testpress users: ${response.status}`);
            }

            const data = await response.json();
            allTestpressUsers = allTestpressUsers.concat(data.results || []);
            nextUrl = data.next;
        }

        console.log(`Fetched ${allTestpressUsers.length} users from Testpress`);

        // 2. Fetch all imported members with testpress_id
        let allImportedMembers = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: membersPage, error } = await supabase
                .from('members')
                .select('id, testpress_id, email, display_name, role')
                .not('testpress_id', 'is', null)
                .range(from, from + pageSize - 1);

            if (error) throw error;

            if (membersPage && membersPage.length > 0) {
                allImportedMembers = allImportedMembers.concat(membersPage);
                from += pageSize;

                if (membersPage.length < pageSize) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        console.log(`Found ${allImportedMembers.length} imported members`);

        // 3. Find missing users
        const importedTestpressIds = new Set(allImportedMembers.map(m => m.testpress_id));
        const missingUsers = allTestpressUsers.filter(tpUser => !importedTestpressIds.has(tpUser.id));

        console.log(`Found ${missingUsers.length} missing users`);

        // 4. Check for duplicates in members table
        const { data: duplicateCheck } = await supabase
            .from('members')
            .select('email, testpress_id, COUNT(*)')
            .not('testpress_id', 'is', null);

        // 5. Check batch associations
        const { data: batchAssociations, error: batchError } = await supabase
            .from('batch_members')
            .select('member_id, batch_id, members!inner(testpress_id), batches(name)')
            .not('members.testpress_id', 'is', null)
            .limit(100);

        if (batchError) console.error('Batch associations error:', batchError);

        // Extract details about missing users
        const missingUserDetails = missingUsers.map(user => ({
            testpress_id: user.id,
            email: user.email,
            username: user.username,
            display_name: user.display_name,
            is_active: user.is_active,
            is_staff: user.is_staff,
            reason: !user.email ? 'No email' :
                !user.is_active ? 'Inactive user' :
                    user.is_staff && !['admin', 'student'].includes(user.is_staff ? 'admin' : 'student') ? 'Invalid role' :
                        'Unknown'
        }));

        return NextResponse.json({
            summary: {
                totalTestpressUsers: allTestpressUsers.length,
                totalImportedMembers: allImportedMembers.length,
                missingCount: missingUsers.length,
                expectedDiscrepancy: 30
            },
            missingUsers: missingUserDetails,
            batchAssociations: {
                sampleAssociations: batchAssociations || [],
                totalChecked: batchAssociations?.length || 0
            },
            analysis: {
                withoutEmail: missingUserDetails.filter(u => u.reason === 'No email').length,
                inactive: missingUserDetails.filter(u => u.reason === 'Inactive user').length,
                invalidRole: missingUserDetails.filter(u => u.reason === 'Invalid role').length,
                unknown: missingUserDetails.filter(u => u.reason === 'Unknown').length
            }
        });

    } catch (error) {
        console.error('Investigation error:', error);
        return NextResponse.json(
            { error: 'Failed to investigate', details: error.message },
            { status: 500 }
        );
    }
}
