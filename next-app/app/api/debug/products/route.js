import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const products = await prisma.products.findMany({
            select: {
                id: true,
                title: true,
                status: true
            }
        });

        // Also get distinct statuses if possible, or just deduce from list
        const distinctStatuses = [...new Set(products.map(p => p.status))];

        return NextResponse.json({
            distinctStatuses,
            products
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
