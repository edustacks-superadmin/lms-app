
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../../../../lib/server/institute';

// GET single page
export async function GET(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;

        const item = await prisma.pages.findFirst({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id),
            },
        });

        if (!item) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        const safeItem = JSON.parse(JSON.stringify(item, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error fetching page:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT update page
export async function PUT(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;
        const body = await request.json();
        const { title, slug, content, is_published } = body;

        const updatedItem = await prisma.pages.update({
            where: {
                id: parseInt(id),
            },
            data: {
                title,
                slug,
                content,
                is_published,
            },
        });

        const safeItem = JSON.parse(JSON.stringify(updatedItem, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error updating page:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE page
export async function DELETE(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;

        await prisma.pages.delete({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id), // Ensure ownership matches
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting page:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
