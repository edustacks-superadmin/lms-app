import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, institute_id } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const newCategory = await prisma.product_categories.create({
            data: {
                name,
                institute_id: institute_id ? BigInt(institute_id) : BigInt(10)
            }
        });

        // Serialize BigInt
        const serialized = JSON.parse(JSON.stringify(newCategory, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(serialized);
    } catch (error) {
        console.error('Category API error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('instituteId');

        const where = {};
        if (instituteId) {
            where.institute_id = BigInt(instituteId);
        }

        const categories = await prisma.product_categories.findMany({
            where,
            orderBy: { created_at: 'desc' },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        const serialized = JSON.parse(JSON.stringify(categories, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(serialized);
    } catch (error) {
        console.error('Category API error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
