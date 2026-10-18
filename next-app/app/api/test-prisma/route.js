import { testPrismaConnection } from '@/app/actions/diagnostic';
import { NextResponse } from 'next/server';

export async function GET() {
    const result = await testPrismaConnection();
    return NextResponse.json(result);
}
