
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../../../lib/server/institute';

// GET all FAQs
export async function GET(request) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const where = {
            institute_id: BigInt(institute.id),
        };

        const items = await prisma.faqs.findMany({
            where,
            orderBy: { display_order: 'asc' },
        });

        const safeItems = JSON.parse(JSON.stringify(items, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItems);
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST create new FAQ
export async function POST(request) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const body = await request.json();
        const { question, answer, category, display_order, is_published } = body;

        if (!question || !answer) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newItem = await prisma.faqs.create({
            data: {
                question,
                answer,
                category,
                display_order: display_order || 0,
                is_published: is_published ?? true,
                institute_id: BigInt(institute.id),
            },
        });

        const safeItem = JSON.parse(JSON.stringify(newItem, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error creating FAQ:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
