
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../../../../lib/server/institute';

// GET single FAQ
export async function GET(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;

        const item = await prisma.faqs.findFirst({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id),
            },
        });

        if (!item) {
            return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }

        const safeItem = JSON.parse(JSON.stringify(item, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error fetching FAQ:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT update FAQ
export async function PUT(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;
        const body = await request.json();
        const { question, answer, category, display_order, is_published } = body;

        const updatedItem = await prisma.faqs.update({
            where: {
                id: parseInt(id),
            },
            data: {
                question,
                answer,
                category,
                display_order,
                is_published,
            },
        });

        const safeItem = JSON.parse(JSON.stringify(updatedItem, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error updating FAQ:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE FAQ
export async function DELETE(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;

        await prisma.faqs.delete({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
