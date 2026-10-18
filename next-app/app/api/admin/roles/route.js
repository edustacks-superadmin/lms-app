import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Singleton

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('instituteId') || 10; // Default or from session

        const roles = await prisma.roles.findMany({
            where: {
                institute_id: BigInt(instituteId) // Ensure BigInt
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        // Fetch user counts for each role
        const rolesWithCounts = await Promise.all(roles.map(async (role) => {
            const count = await prisma.members.count({
                where: {
                    role: role.name, // Matching by name as strictly defined
                    institute_id: BigInt(instituteId)
                }
            });

            return {
                ...role,
                id: role.id.toString(),
                institute_id: role.institute_id?.toString(),
                permissions: role.permissions || {},
                userCount: count
            };
        }));

        return NextResponse.json({ roles: rolesWithCounts });
    } catch (error) {
        console.error('Error fetching roles:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, permissions, description, instituteId } = body;

        if (!name) {
            return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
        }

        const newRole = await prisma.roles.create({
            data: {
                name,
                permissions: permissions || {},
                description,
                institute_id: BigInt(instituteId || 10)
            }
        });

        return NextResponse.json({
            role: {
                ...newRole,
                id: newRole.id.toString(),
                institute_id: newRole.institute_id?.toString()
            }
        });
    } catch (error) {
        console.error('Error creating role:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
