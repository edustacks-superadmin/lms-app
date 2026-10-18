import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, logo_url, website_url, display_order, is_active } = body;

        const logo = await prisma.partner_logos.update({
            where: { id: parseInt(id) },
            data: {
                name,
                logo_url,
                website_url: website_url || null,
                display_order: display_order || 0,
                is_active: is_active !== undefined ? is_active : true,
                updated_at: new Date()
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
        console.error('Error updating partner logo:', error);
        return NextResponse.json({ error: 'Failed to update logo' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        await prisma.partner_logos.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting partner logo:', error);
        return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
    }
}
