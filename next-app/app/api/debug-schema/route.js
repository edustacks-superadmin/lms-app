import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('members')
            .select('*')
            .limit(1);

        // Fetch detailed column info from information_schema (requires raw SQL usually, but we can't run raw SQL via JS client easily without a stored proc).
        // BUT, we can try to fetch a single row and see the structure, or rely on the error message if we try to insert extended data.

        // Actually, we can use the 'rpc' call if we had a function, but we don't.
        // Let's try to just return the first member to see what a "valid" member looks like.
        // AND, let's try to inspect the error by intentionally failing an insert in a way that gives us info? No, that's risky.

        // Better: We can infer schema from the first row of data, if any exist.

        let schemaInfo = {
            columns: [],
            sampleRow: data ? data[0] : null,
            error: error
        };

        return NextResponse.json(schemaInfo, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
