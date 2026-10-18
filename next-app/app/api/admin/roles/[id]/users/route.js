import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Get users with this role
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const role = await prisma.roles.findUnique({
            where: { id: BigInt(id) },
            select: { name: true }
        });

        if (!role) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        // Fetch users from members table where role matches or custom logic
        // Since members.role is a string, we assume it stores the role name 
        // OR we need to migrate members.role to be a relation.
        // For Phase 1, we will match members.role = role.name

        const users = await prisma.members.findMany({
            where: { role: role.name },
            select: {
                id: true,
                display_name: true,
                email: true,
                photo_url: true
            }
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching role users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Assign user to role
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { userId } = body;

        const role = await prisma.roles.findUnique({
            where: { id: BigInt(id) },
            select: { name: true }
        });

        if (!role) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        // Update member role
        const updatedMember = await prisma.members.update({
            where: { id: parseInt(userId) },
            data: { role: role.name }
        });

        return NextResponse.json({ success: true, user: updatedMember });
    } catch (error) {
        console.error('Error assigning user to role:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Remove user from role (set to 'student' or null?)
// For now set to default 'student'
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Update member role to default
        await prisma.members.update({
            where: { id: parseInt(userId) },
            data: { role: 'student' }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing user from role:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
