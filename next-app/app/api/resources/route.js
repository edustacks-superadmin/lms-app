
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const instituteId = searchParams.get('institute_id');
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        const where = {
            institute_id: parseInt(instituteId),
            is_active: true // Only active resources for public
        };

        if (category) {
            where.category = category;
        }

        const { Prisma } = require('@prisma/client');

        let resources;
        if (search) {
            const searchPattern = `%${search}%`;
            const categoryFilter = category ? Prisma.sql`AND category = ${category}` : Prisma.empty;

            resources = await prisma.$queryRaw`
                SELECT * FROM public.resources 
                WHERE institute_id = ${BigInt(instituteId)}
                AND is_active = true
                ${categoryFilter}
                AND (
                    title ILIKE ${searchPattern} 
                    OR description ILIKE ${searchPattern}
                    OR exam_name ILIKE ${searchPattern}
                    OR CAST(metadata AS TEXT) ILIKE ${searchPattern}
                )
                ORDER BY id ASC
            `;
        } else {
            resources = await prisma.resources.findMany({
                where,
                orderBy: { id: 'asc' }, // Oldest first as requested
            });
        }

        const formattedResources = resources.map(res => ({
            ...res,
            institute_id: res.institute_id.toString(),
            id: res.id
        }));

        return NextResponse.json({
            resources: formattedResources,
            metadata: {
                total: formattedResources.length,
                page: 1,
                limit: formattedResources.length,
                totalPages: 1
            }
        });

    } catch (error) {
        console.error('API Public Resources GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
