
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
    try {
        const { id: paramId } = await params;
        const id = parseInt(paramId);
        const resource = await prisma.resources.findUnique({
            where: { id }
        });

        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        return NextResponse.json({
            resource: {
                ...resource,
                institute_id: resource.institute_id.toString()
            }
        });
    } catch (error) {
        console.error('API Admin Resource GET Error:', error);
        console.error('Failed ID:', (await params).id);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { id: paramId } = await params;
        const id = parseInt(paramId);
        const body = await request.json();
        const {
            title,
            description,
            category,
            file_url,
            resource_type,
            is_active,
            exam_name,
            metadata
        } = body;

        const updatedResource = await prisma.resources.update({
            where: { id },
            data: {
                title,
                description,
                category,
                file_url,
                resource_type,
                is_active,
                exam_name,
                metadata
            }
        });

        return NextResponse.json({
            success: true,
            resource: {
                ...updatedResource,
                institute_id: updatedResource.institute_id.toString()
            }
        });

    } catch (error) {
        console.error('API Admin Resource PUT Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id: paramId } = await params;
        const id = parseInt(paramId);

        await prisma.resources.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Admin Resource DELETE Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
