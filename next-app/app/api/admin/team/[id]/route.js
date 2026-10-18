
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../../../../lib/server/institute';

// GET single team member
export async function GET(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;

        const item = await prisma.team_members.findFirst({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id),
            },
        });

        if (!item) {
            return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
        }

        const safeItem = JSON.parse(JSON.stringify(item, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error fetching team member:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT update team member
export async function PUT(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, role, bio, photo_url, display_order, is_active } = body;

        const updatedItem = await prisma.team_members.update({
            where: {
                id: parseInt(id),
            },
            data: {
                name,
                role,
                bio,
                photo_url,
                display_order,
                is_active,
            },
        });

        const safeItem = JSON.parse(JSON.stringify(updatedItem, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(safeItem);
    } catch (error) {
        console.error('Error updating team member:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE team member
export async function DELETE(request, { params }) {
    try {
        const institute = await fetchInstituteServer();
        if (!institute) {
            return NextResponse.json({ error: 'Institute not found' }, { status: 404 });
        }

        const { id } = await params;

        await prisma.team_members.delete({
            where: {
                id: parseInt(id),
                institute_id: BigInt(institute.id),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting team member:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
