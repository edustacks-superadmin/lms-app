import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        const role = await prisma.roles.findUnique({
            where: { id: BigInt(id) }
        });

        if (!role) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        return NextResponse.json({
            role: {
                ...role,
                id: role.id.toString(),
                institute_id: role.institute_id?.toString(),
                permissions: role.permissions || {}
            }
        });
    } catch (error) {
        console.error('Error fetching role:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, permissions, description } = body;

        const updatedRole = await prisma.roles.update({
            where: { id: BigInt(id) },
            data: {
                name,
                permissions,
                description,
                updated_at: new Date()
            }
        });

        return NextResponse.json({
            role: {
                ...updatedRole,
                id: updatedRole.id.toString(),
                institute_id: updatedRole.institute_id?.toString()
            }
        });
    } catch (error) {
        console.error('Error updating role:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        // Optional: Check if any users are assigned before deleting?
        // For now, allow delete.

        await prisma.roles.delete({
            where: { id: BigInt(id) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting role:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
