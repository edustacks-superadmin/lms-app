import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        console.log('Testing simple batch query...');

        // Try the simplest possible query
        const count = await prisma.batches.count();
        console.log('Total batches in DB:', count);

        // Try to fetch batches
        const batches = await prisma.batches.findMany({
            take: 5,
        });

        console.log('Fetched batches:', batches?.length || 0);

        return NextResponse.json({
            success: true,
            count,
            batchesFound: batches?.length || 0,
            sampleBatch: batches[0] || null,
            allBatchNames: batches.map(b => b.name)
        });
    } catch (error) {
        console.error('Database query error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            name: error.name
        }, { status: 500 });
    }
}
