
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('institute_id');

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        const settings = await prisma.institute_settings.findFirst({
            where: { id: BigInt(instituteId) },
            select: {
                label_resource_syllabus: true,
                label_resource_pyq: true,
                label_resource_notifications: true,
                label_resource_page_title: true,
            }
        });

        return NextResponse.json(settings || {});

    } catch (error) {
        console.error('API Admin Resource Settings GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const {
            institute_id,
            label_resource_syllabus,
            label_resource_pyq,
            label_resource_notifications,
            label_resource_page_title
        } = body;

        if (!institute_id) {
            return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
        }

        const updatedSettings = await prisma.institute_settings.update({
            where: { id: BigInt(institute_id) },
            data: {
                label_resource_syllabus,
                label_resource_pyq,
                label_resource_notifications,
                label_resource_page_title
            }
        });

        // Convert BigInt to string
        const serializedSettings = {
            ...updatedSettings,
            id: updatedSettings.id.toString(),
            institute_id: updatedSettings.institute_id?.toString()
        };

        return NextResponse.json({ success: true, settings: serializedSettings });

    } catch (error) {
        console.error('API Admin Resource Settings PUT Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
