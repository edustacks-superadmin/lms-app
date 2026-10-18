
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../../../../lib/server/institute';

// GET single career
export async function GET(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;

        const item = await prisma.careers.findFirst({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id),
            },
        });

        if (!item) {
            return NextResponse.json({ error: 'Career not found' }, { status: 404 });
        }

        const safeItem = JSON.parse(JSON.stringify(item, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error fetching career:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT update career
export async function PUT(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;
        const body = await request.json();
        const { title, description, type, location, is_active } = body;

        const updatedItem = await prisma.careers.update({
            where: {
                id: parseInt(id),
            },
            data: {
                title,
                description,
                type,
                location,
                is_active,
            },
        });

        const safeItem = JSON.parse(JSON.stringify(updatedItem, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error updating career:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE career
export async function DELETE(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;

        await prisma.careers.delete({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting career:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
