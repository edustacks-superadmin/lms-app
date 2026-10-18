import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
    try {
        // Get basic statistics
        const { count: totalMembers, error: statsError } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true });

        if (statsError) throw statsError;

        // Get Testpress-specific statistics
        const { data: testpressStats, error: testpressError, count: testpressCount } = await supabase
            .from('members')
            .select('testpress_id', { count: 'exact' })
            .not('testpress_id', 'is', null)
            .range(0, 50000);

        if (testpressError) throw testpressError;

        // Get role distribution
        const { data: roleStats, error: roleError } = await supabase
            .from('members')
            .select('role')
            .range(0, 50000);

        if (roleError) throw roleError;

        // Check for duplicates in testpress_id
        let duplicates = null;
        try {
            const { data, error } = await supabase.rpc('check_testpress_duplicates', {});
            if (!error) duplicates = data;
        } catch (e) {
            // RPC doesn't exist, we'll skip this check
            console.warn('RPC check_testpress_duplicates not available:', e.message);
        }

        // Get sample records
        const { data: sampleRecords, error: sampleError } = await supabase
            .from('members')
            .select('id, display_name, email, role, testpress_id, username, first_name, last_name')
            .not('testpress_id', 'is', null)
            .limit(10);

        if (sampleError) throw sampleError;

        // Count unique values
        const uniqueTestpressIds = new Set(testpressStats.map(m => m.testpress_id)).size;
        const roleCounts = roleStats.reduce((acc, m) => {
            acc[m.role] = (acc[m.role] || 0) + 1;
            return acc;
        }, {});

        // Check for missing required fields
        const { data: missingFields, error: missingError } = await supabase
            .from('members')
            .select('id, display_name, email, role, testpress_id, username')
            .not('testpress_id', 'is', null)
            .or('display_name.is.null,email.is.null,role.is.null');

        if (missingError) throw missingError;

        return NextResponse.json({
            summary: {
                totalMembers: totalMembers || 0,
                membersWithTestpressId: testpressCount || 0,
                uniqueTestpressIds,
                expectedTotal: 13818,
                discrepancy: 13818 - (testpressCount || 0),
            },
            roleDistribution: roleCounts,
            dataQuality: {
                recordsWithMissingFields: missingFields.length,
                missingFieldRecords: missingFields,
            },
            sampleRecords,
        });
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { error: 'Failed to verify import', details: error.message },
            { status: 500 }
        );
    }
}
