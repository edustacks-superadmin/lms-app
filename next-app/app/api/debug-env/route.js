import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'undefined',
        keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    });
}
