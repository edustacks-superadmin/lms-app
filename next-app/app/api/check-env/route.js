import { NextResponse } from 'next/server';

export async function GET() {
    const envCheck = {
        DATABASE_URL: {
            exists: !!process.env.DATABASE_URL,
            length: process.env.DATABASE_URL?.length || 0,
            preview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET'
        },
        DIRECT_URL: {
            exists: !!process.env.DIRECT_URL,
            length: process.env.DIRECT_URL?.length || 0,
            preview: process.env.DIRECT_URL ? process.env.DIRECT_URL.substring(0, 30) + '...' : 'NOT SET'
        },
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV
    };

    return NextResponse.json(envCheck);
}
