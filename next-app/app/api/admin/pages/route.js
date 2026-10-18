
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../../../lib/server/institute';

// GET all pages
export async function GET(request) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const where = {
            institute_id: BigInt(institute.id),
        };

        const items = await prisma.pages.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });

        const safeItems = JSON.parse(JSON.stringify(items, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItems);
    } catch (error) {
        console.error('Error fetching pages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST create new page
export async function POST(request) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const body = await request.json();
        const { title, slug, content, is_published } = body;

        if (!title || !slug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newItem = await prisma.pages.create({
            data: {
                title,
                slug,
                content,
                is_published: is_published ?? true,
                institute_id: BigInt(institute.id),
            },
        });

        const safeItem = JSON.parse(JSON.stringify(newItem, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error creating page:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
