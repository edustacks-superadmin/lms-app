import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const instituteId = searchParams.get('instituteId');

        if (!instituteId) {
            return NextResponse.json({ error: 'Institute ID required' }, { status: 400 });
        }

        const logos = await prisma.partner_logos.findMany({
            where: {
                institute_id: BigInt(instituteId),
                is_active: true
            },
            orderBy: { display_order: 'asc' }
        });

        // Convert BigInt to string for JSON serialization
        const serializedLogos = logos.map(logo => ({
            ...logo,
            id: logo.id.toString(),
            institute_id: logo.institute_id.toString()
        }));

        return NextResponse.json({ success: true, data: serializedLogos });
    } catch (error) {
        console.error('Error fetching partner logos:', error);
        return NextResponse.json({ error: 'Failed to fetch logos' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, logo_url, website_url, display_order, institute_id } = body;

        if (!name || !logo_url || !institute_id) {
            return NextResponse.json(
                { error: 'Name, logo URL, and institute ID are required' },
                { status: 400 }
            );
        }

        const logo = await prisma.partner_logos.create({
            data: {
                name,
                logo_url,
                website_url: website_url || null,
                display_order: display_order || 0,
                institute_id: BigInt(institute_id),
                is_active: true
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                ...logo,
                id: logo.id.toString(),
                institute_id: logo.institute_id.toString()
            }
        });
    } catch (error) {
        console.error('Error creating partner logo:', error);
        return NextResponse.json({ error: 'Failed to create logo' }, { status: 500 });
    }
}
