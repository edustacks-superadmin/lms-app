import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('instituteId');

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        const { name } = body;

        const updatedCategory = await prisma.product_categories.update({
            where: {
                id: parseInt(id),
                institute_id: BigInt(instituteId)
            },
            data: { name }
        });

        const serialized = JSON.parse(JSON.stringify(updatedCategory, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(serialized);
    } catch (error) {
        console.error('Category Update Error:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Category not found or access denied' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('instituteId');

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        await prisma.product_categories.delete({
            where: {
                id: parseInt(id),
                institute_id: BigInt(instituteId)
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Category Delete Error:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Category not found or access denied' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
