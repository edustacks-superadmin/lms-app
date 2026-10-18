
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../../../lib/server/institute';

// GET all gallery items
export async function GET(request) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'image' or 'video' (optional)

        const where = {
            institute_id: BigInt(institute.id),
        };

        if (type) {
            where.type = type;
        }

        const items = await prisma.gallery_items.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });

        // Handle BigInt serialization
        const safeItems = JSON.parse(JSON.stringify(items, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItems);
    } catch (error) {
        console.error('Error fetching gallery items:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST create new gallery item
export async function POST(request) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const body = await request.json();
        const { title, description, type, url, thumbnail_url, is_active } = body;

        if (!title || !url || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newItem = await prisma.gallery_items.create({
            data: {
                title,
                description,
                type,
                url,
                thumbnail_url,
                is_active: is_active ?? true,
                institute_id: BigInt(institute.id),
            },
        });

        const safeItem = JSON.parse(JSON.stringify(newItem, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error creating gallery item:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error', details: error }, { status: 500 });
    }
}
