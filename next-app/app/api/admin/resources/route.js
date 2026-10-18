
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

        const { Prisma } = require('@prisma/client');

        const where = {
            institute_id: parseInt(instituteId),
        };

        if (category) {
            where.category = category;
        }

        let resources;
        if (search) {
            const searchPattern = `%${search}%`;
            const categoryFilter = category ? Prisma.sql`AND category = ${category}` : Prisma.empty;

            resources = await prisma.$queryRaw`
                SELECT * FROM public.resources 
                WHERE institute_id = ${BigInt(instituteId)}
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
                orderBy: { id: 'asc' },
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
        console.error('API Admin Resources GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            title,
            description,
            category,
            file_url,
            resource_type,
            institute_id,
            is_active,
            exam_name,
            metadata
        } = body;

        if (!title || !institute_id) {
            return NextResponse.json({ error: 'Title and Institute ID are required' }, { status: 400 });
        }

        const newResource = await prisma.resources.create({
            data: {
                title,
                description,
                category: category || 'Other',
                file_url,
                resource_type: resource_type || 'file',
                is_active: is_active !== undefined ? is_active : true,
                institute_id: BigInt(institute_id),
                exam_name,
                metadata
            }
        });

        return NextResponse.json({
            success: true,
            resource: {
                ...newResource,
                institute_id: newResource.institute_id.toString()
            }
        });

    } catch (error) {
        console.error('API Admin Resources POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
