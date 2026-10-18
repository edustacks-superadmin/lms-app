
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../../../../lib/server/institute';

// GET single gallery item
export async function GET(request, props) {
    const params = await props.params;
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = params;

        const item = await prisma.gallery_items.findFirst({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id),
            },
        });

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        const safeItem = JSON.parse(JSON.stringify(item, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error fetching gallery item:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT update gallery item
export async function PUT(request, props) {
    const params = await props.params;
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = params;
        const body = await request.json();
        const { title, description, type, url, thumbnail_url, is_active } = body;

        const updatedItem = await prisma.gallery_items.update({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id),
            },
            data: {
                title,
                description,
                type,
                url,
                thumbnail_url,
                is_active,
                updated_at: new Date(),
            },
        });

        const safeItem = JSON.parse(JSON.stringify(updatedItem, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error updating gallery item:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE gallery item
export async function DELETE(request, props) {
    const params = await props.params;
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = params;

        await prisma.gallery_items.delete({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting gallery item:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
